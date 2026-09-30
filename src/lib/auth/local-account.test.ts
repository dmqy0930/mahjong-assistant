import { beforeEach, describe, expect, it } from 'vitest';
import {
  getCurrentAccount,
  normalizeEmail,
  registerAccount,
  signIn,
  signOut,
  validateCredentials,
} from './local-account';

/** Node 环境没有 localStorage，这里做一个最小实现 */
function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
  (globalThis as Record<string, unknown>).window = { localStorage };
  (globalThis as Record<string, unknown>).localStorage = localStorage;
  return store;
}

let store: Map<string, string>;

beforeEach(() => {
  store = installStorage();
});

describe('validateCredentials', () => {
  it('邮箱格式不对会报错', () => {
    expect(validateCredentials('not-an-email', '123456')).toBe('请输入有效的邮箱地址');
  });

  it('密码太短会报错', () => {
    expect(validateCredentials('a@b.com', '123')).toBe('密码至少 6 位');
  });

  it('合法时返回 null', () => {
    expect(validateCredentials('a@b.com', '123456')).toBeNull();
  });
});

describe('normalizeEmail', () => {
  it('去空格并转小写', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
  });
});

describe('注册与登录', () => {
  it('注册成功后直接处于登录态', async () => {
    const result = await registerAccount('user@example.com', 'secret123');
    expect(result.ok).toBe(true);
    expect(getCurrentAccount()?.email).toBe('user@example.com');
  });

  it('同一邮箱重复注册会被拒绝', async () => {
    await registerAccount('user@example.com', 'secret123');
    const again = await registerAccount('user@example.com', 'another123');
    expect(again.ok).toBe(false);
    expect(again.error).toContain('已在本机注册过');
  });

  it('大小写与空格视为同一账号', async () => {
    await registerAccount('User@Example.com', 'secret123');
    const again = await registerAccount(' user@example.com ', 'secret123');
    expect(again.ok).toBe(false);
  });

  it('密码错误无法登录', async () => {
    await registerAccount('user@example.com', 'secret123');
    signOut();
    const wrong = await signIn('user@example.com', 'wrongpass');
    expect(wrong.ok).toBe(false);
    expect(wrong.error).toBe('密码不正确');
    expect(getCurrentAccount()).toBeNull();
  });

  it('密码正确可以登录', async () => {
    await registerAccount('user@example.com', 'secret123');
    signOut();
    expect(getCurrentAccount()).toBeNull();

    const ok = await signIn('user@example.com', 'secret123');
    expect(ok.ok).toBe(true);
    expect(getCurrentAccount()?.email).toBe('user@example.com');
  });

  it('未注册的邮箱无法登录', async () => {
    const result = await signIn('nobody@example.com', 'secret123');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('请先注册');
  });
});

describe('本地存储的安全性', () => {
  it('不会把明文密码写进 localStorage', async () => {
    await registerAccount('user@example.com', 'plain-text-password');
    const dumped = [...store.values()].join('');
    expect(dumped).not.toContain('plain-text-password');
  });

  it('每条账号都使用独立盐值', async () => {
    await registerAccount('a@example.com', 'secret123');
    signOut();
    await registerAccount('b@example.com', 'secret123');

    const state = JSON.parse([...store.values()][0]) as {
      accounts: Record<string, { salt: string; hash: string }>;
    };
    const salts = Object.values(state.accounts).map(a => a.salt);
    expect(new Set(salts).size).toBe(salts.length);

    // 相同密码 + 不同盐 → 派生结果必须不同
    const hashes = Object.values(state.accounts).map(a => a.hash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('退出登录只清当前身份，账号本身保留', async () => {
    await registerAccount('user@example.com', 'secret123');
    signOut();
    expect(getCurrentAccount()).toBeNull();

    const again = await signIn('user@example.com', 'secret123');
    expect(again.ok).toBe(true);
  });
});
