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
