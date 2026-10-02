'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 去掉结尾斜杠，以及误抄进来的 /rest/v1 之类的路径。
 * 环境变量里多一个斜杠或一段路径，请求就会变成
 * https://xxx.supabase.co/dashboard/rest/v1/... ，网关直接报
 * "Invalid path specified in request URL"。
 */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  let value = (raw ?? '').trim();
  if (!value) return '';
  value = value.replace(/\/+$/, '');
  value = value.replace(/\/rest\/v1$/i, '');
  return value.replace(/\/+$/, '');
}

/** 返回配置问题描述；null 表示配置可用 */
export function roomConfigProblem(): string | null {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

  if (!url || !key) {
    return '房间服务未配置：请在部署平台设置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY';
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return `NEXT_PUBLIC_SUPABASE_URL 格式不正确：${url}`;
  }

  if (parsed.protocol !== 'https:') {
    return `NEXT_PUBLIC_SUPABASE_URL 必须是 https：当前是 ${url}`;
  }
  if (!/\.supabase\.(co|in)$/i.test(parsed.hostname)) {
    return `NEXT_PUBLIC_SUPABASE_URL 看起来不是 Supabase 项目地址：${url}。应形如 https://<项目ref>.supabase.co`;
  }
  if (parsed.pathname && parsed.pathname !== '/') {
    return `NEXT_PUBLIC_SUPABASE_URL 不应带路径：${url}。请只填到 .supabase.co 为止，不要带 /rest/v1 等后缀`;
  }
  return null;
}

/** 房间功能依赖 Supabase；配置不完整时整个功能优雅降级 */
export function roomServiceConfigured(): boolean {
  return roomConfigProblem() === null;
}

let cached: SupabaseClient | null = null;

export interface ServiceConfigInfo {
  configured: boolean;
  urlHost: string | null;
  /** anon key 是 JWT，payload 里的 role 能看出用的是哪种 key */
  keyRole: string | null;
  keyRef: string | null;
}

/** 解出 Supabase key 的角色（anon / service_role），不做签名校验 */
export function decodeKeyRole(key: string): { role: string | null; ref: string | null } {
  const parts = (key ?? '').split('.');
  if (parts.length !== 3) return { role: null, ref: null };
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { role?: string; ref?: string };
    return { role: payload.role ?? null, ref: payload.ref ?? null };
  } catch {
    return { role: null, ref: null };
  }
}

export function describeServiceConfig(): ServiceConfigInfo {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const { role, ref } = decodeKeyRole(key);

  let urlHost: string | null = null;
  if (url) {
    try {
      urlHost = new URL(url).host;
    } catch {
      urlHost = url.slice(0, 40);
    }
  }

  return {
    configured: Boolean(url && key),
    urlHost,
    keyRole: role,
    keyRef: ref,
  };
}

export function getRoomClient(): SupabaseClient | null {
  if (!roomServiceConfigured()) return null;
  if (!cached) {
    cached = createClient(
      normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return cached;
}
