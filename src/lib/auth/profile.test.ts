import { beforeEach, describe, expect, it } from 'vitest';
import {
  NICKNAME_MAX_LENGTH,
  clearNickname,
  getNickname,
  hasNickname,
  normalizeNickname,
  setNickname,
  validateNickname,
} from './profile';

function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
  return store;
}

beforeEach(() => {
  installStorage();
});

describe('normalizeNickname', () => {
  it('去掉首尾空格并把连续空格压成一个', () => {
    expect(normalizeNickname('  张三   丰 ')).toBe('张三 丰');
  });
});

describe('validateNickname', () => {
  it('空昵称不允许', () => {
    expect(validateNickname('   ')).toBe('请输入昵称');
  });

  it('超长昵称不允许', () => {
    expect(validateNickname('a'.repeat(NICKNAME_MAX_LENGTH + 1))).toContain('最多');
  });

  it('正常昵称通过', () => {
    expect(validateNickname(' 雀士 ')).toBeNull();
  });
});

describe('昵称读写', () => {
  it('默认没有昵称', () => {
    expect(getNickname()).toBe('');
    expect(hasNickname()).toBe(false);
  });

  it('保存后能读回，并已归一化', () => {
    const result = setNickname('  东  风 ');
    expect(result.ok).toBe(true);
    expect(result.nickname).toBe('东 风');
    expect(getNickname()).toBe('东 风');
    expect(hasNickname()).toBe(true);
  });

  it('非法昵称不会写入', () => {
    expect(setNickname('').ok).toBe(false);
    expect(getNickname()).toBe('');
  });

  it('可以清除', () => {
    setNickname('小明');
    clearNickname();
    expect(getNickname()).toBe('');
    expect(hasNickname()).toBe(false);
  });

  it('覆盖写会替换旧值', () => {
    setNickname('甲');
    setNickname('乙');
    expect(getNickname()).toBe('乙');
  });
});
