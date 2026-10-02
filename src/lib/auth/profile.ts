/**
 * 本地昵称。
 *
 * 只存一个昵称，不涉及邮箱、密码或任何身份校验——它纯粹是本机的一个显示名，
 * 存在浏览器里，不上传服务器。用途是给对局房间、新建对局预填玩家名。
 */

const STORAGE_KEY = 'mahjong-nickname';
export const NICKNAME_MAX_LENGTH = 16;

export function normalizeNickname(raw: string): string {
  return (raw ?? '').trim().replace(/\s+/g, ' ');
}

export function validateNickname(raw: string): string | null {
  const value = normalizeNickname(raw);
  if (!value) return '请输入昵称';
  if (value.length > NICKNAME_MAX_LENGTH) return `昵称最多 ${NICKNAME_MAX_LENGTH} 个字`;
  return null;
}

export function getNickname(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function hasNickname(): boolean {
  return getNickname() !== '';
}

export function setNickname(raw: string): { ok: boolean; error?: string; nickname?: string } {
  const invalid = validateNickname(raw);
  if (invalid) return { ok: false, error: invalid };
  if (typeof window === 'undefined') return { ok: false, error: '当前环境无法保存' };

  const nickname = normalizeNickname(raw);
  try {
    window.localStorage.setItem(STORAGE_KEY, nickname);
    return { ok: true, nickname };
  } catch {
    return { ok: false, error: '保存失败：浏览器存储不可用（可能是隐私模式）' };
  }
}

export function clearNickname(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略
  }
}
