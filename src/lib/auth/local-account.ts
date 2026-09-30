/**
 * 纯本地的账号系统。
 *
 * 账号只存在浏览器里，不上传服务器：这符合"不收集用户数据"的取向，
 * 但也意味着它只是一个**本地身份标签**——换设备就没了，且不具备真正的
 * 安全性（能打开这个浏览器的人就能读到本地数据）。密码只存 PBKDF2 派生值。
 */

export interface LocalAccount {
  email: string;
  /** 派生用盐，base64 */
  salt: string;
  /** PBKDF2 派生结果，base64。绝不存明文密码 */
  hash: string;
  iterations: number;
  createdAt: number;
}

interface AuthState {
  accounts: Record<string, LocalAccount>;
  currentEmail: string | null;
}

const STORAGE_KEY = 'mahjong-local-auth';
const ITERATIONS = 150_000;
const MIN_PASSWORD_LENGTH = 6;

const EMPTY_STATE: AuthState = { accounts: {}, currentEmail: null };

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function hasSubtleCrypto(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function validateCredentials(email: string, password: string): string | null {
  if (!isValidEmail(email)) return '请输入有效的邮箱地址';
  if (password.length < MIN_PASSWORD_LENGTH) return `密码至少 ${MIN_PASSWORD_LENGTH} 位`;
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveHash(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

export function loadAuthState(): AuthState {
  if (!isBrowser()) return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return {
      accounts: parsed.accounts && typeof parsed.accounts === 'object' ? parsed.accounts : {},
      currentEmail: parsed.currentEmail ?? null,
    };
  } catch {
    return EMPTY_STATE;
  }
}

function saveAuthState(state: AuthState): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getCurrentAccount(): LocalAccount | null {
  const state = loadAuthState();
  if (!state.currentEmail) return null;
  return state.accounts[state.currentEmail] ?? null;
}

export async function registerAccount(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const invalid = validateCredentials(email, password);
  if (invalid) return { ok: false, error: invalid };
  if (!hasSubtleCrypto()) {
    return { ok: false, error: '当前环境不支持加密接口（需 HTTPS 或 localhost）' };
  }

  const key = normalizeEmail(email);
  const state = loadAuthState();

  // 本地账号没有找回途径，重复注册直接当登录处理会更安全，
  // 但这里明确报错，避免用户以为换了个新账号。
  if (state.accounts[key]) {
    return { ok: false, error: '该邮箱已在本机注册过，请直接登录' };
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveHash(password, salt, ITERATIONS);

  saveAuthState({
    accounts: {
      ...state.accounts,
      [key]: {
        email: key,
        salt: toBase64(salt),
        hash,
        iterations: ITERATIONS,
        createdAt: Date.now(),
      },
    },
    currentEmail: key,
  });
  return { ok: true };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const invalid = validateCredentials(email, password);
  if (invalid) return { ok: false, error: invalid };
  if (!hasSubtleCrypto()) {
    return { ok: false, error: '当前环境不支持加密接口（需 HTTPS 或 localhost）' };
  }

  const key = normalizeEmail(email);
  const state = loadAuthState();
  const account = state.accounts[key];
  if (!account) return { ok: false, error: '本机没有这个账号，请先注册' };

  const hash = await deriveHash(password, fromBase64(account.salt), account.iterations);
  if (hash !== account.hash) return { ok: false, error: '密码不正确' };

  saveAuthState({ ...state, currentEmail: key });
  return { ok: true };
}

export function signOut(): void {
  const state = loadAuthState();
  saveAuthState({ ...state, currentEmail: null });
}

/** 供界面展示：未登录时给个占位名 */
export function currentDisplayName(): string {
  const account = getCurrentAccount();
  if (!account) return '';
  return account.email.split('@')[0] || account.email;
}
