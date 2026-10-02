import { afterEach, describe, expect, it } from 'vitest';
import { normalizeSupabaseUrl, roomConfigProblem } from './client';

const ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;

function setEnv(url: string | undefined, key: string | undefined) {
  // 注意：给 process.env 赋 undefined 会变成字符串 "undefined"，必须用 delete
  const values: Record<(typeof ENV_KEYS)[number], string | undefined> = {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
  };
  for (const name of ENV_KEYS) {
    const value = values[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

afterEach(() => {
  for (const name of ENV_KEYS) delete process.env[name];
});

describe('normalizeSupabaseUrl', () => {
  it('去掉结尾斜杠', () => {
    expect(normalizeSupabaseUrl('https://abc.supabase.co/')).toBe('https://abc.supabase.co');
  });

  it('去掉误抄进来的 /rest/v1', () => {
    expect(normalizeSupabaseUrl('https://abc.supabase.co/rest/v1')).toBe(
      'https://abc.supabase.co',
    );
    expect(normalizeSupabaseUrl('https://abc.supabase.co/rest/v1/')).toBe(
      'https://abc.supabase.co',
    );
  });

  it('正常地址保持不变', () => {
    expect(normalizeSupabaseUrl(' https://abc.supabase.co ')).toBe('https://abc.supabase.co');
  });
});

describe('roomConfigProblem', () => {
  const url = 'https://abcdefgh.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';

  it('配置完整时没有问题', () => {
    setEnv(url, key);
    expect(roomConfigProblem()).toBeNull();
  });

  it('缺配置时提示未配置', () => {
    setEnv(undefined, undefined);
    expect(roomConfigProblem()).toContain('未配置');
  });

  it('地址带额外路径时明确指出', () => {
    setEnv(`${url}/dashboard`, key);
    expect(roomConfigProblem()).toContain('不应带路径');
  });

  it('填成 REST 端点时能被纠正，不报错', () => {
    setEnv(`${url}/rest/v1`, key);
    expect(roomConfigProblem()).toBeNull();
  });

  it('不是 Supabase 地址时提示', () => {
    setEnv('https://example.com', key);
    expect(roomConfigProblem()).toContain('不是 Supabase 项目地址');
  });

  it('非 https 时提示', () => {
    setEnv('http://abc.supabase.co', key);
    expect(roomConfigProblem()).toContain('必须是 https');
  });

  it('格式错误时提示', () => {
    setEnv('not-a-url', key);
    expect(roomConfigProblem()).toContain('格式不正确');
  });
});
