'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 房间功能依赖 Supabase。未配置环境变量时整个功能优雅降级，
 * 界面会提示需要先完成配置，而不是直接报错。
 */
export function roomServiceConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
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
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return cached;
}
