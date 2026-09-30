'use client';

import { getRoomClient, roomServiceConfigured } from './client';
import {
  normalizeMeta,
  normalizeRoomCode,
  type RoomMeta,
  type RoomRoundRecord,
  type RoomSnapshot,
  type RoundPayload,
} from './types';

export interface RoomResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

const NOT_CONFIGURED = '房间服务未配置：请先在 Vercel 里设置 SUPABASE 相关环境变量';

function friendly(message: string): string {
  if (message.includes('room_not_found')) return '房间不存在或已被删除';
  if (message.includes('round_not_found')) return '这一局已经不存在了，可能被其他人删除';
  if (message.toLowerCase().includes('failed to fetch')) return '网络异常，请检查网络后重试';
  return message;
}

export async function createRoom(meta: RoomMeta): Promise<RoomResult<string>> {
  if (!roomServiceConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const client = getRoomClient();
  if (!client) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await client.rpc('create_room', { p_meta: meta });
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true, data: normalizeRoomCode(String(data)) };
}

export async function fetchRoom(code: string): Promise<RoomResult<RoomSnapshot>> {
  if (!roomServiceConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const client = getRoomClient();
  if (!client) return { ok: false, error: NOT_CONFIGURED };

  const normalized = normalizeRoomCode(code);
  const { data, error } = await client.rpc('room_snapshot', { p_code: normalized });
  if (error) return { ok: false, error: friendly(error.message) };

  const raw = (data ?? {}) as { room?: { meta?: unknown } & Record<string, unknown>; rounds?: unknown };
  const room = raw.room
    ? ({ ...raw.room, meta: normalizeMeta(raw.room.meta) } as RoomSnapshot['room'])
    : null;
  const rounds = Array.isArray(raw.rounds) ? (raw.rounds as RoomRoundRecord[]) : [];

  return { ok: true, data: { room, rounds } };
}

export async function addRound(
  code: string,
  payload: RoundPayload,
  by: string,
): Promise<RoomResult<RoomRoundRecord>> {
  if (!roomServiceConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const client = getRoomClient();
  if (!client) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await client.rpc('room_add_round', {
    p_code: normalizeRoomCode(code),
    p_payload: payload,
    p_by: by,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true, data: data as RoomRoundRecord };
}

export async function updateRound(
  code: string,
  id: number,
  payload: RoundPayload,
): Promise<RoomResult<RoomRoundRecord>> {
  if (!roomServiceConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const client = getRoomClient();
  if (!client) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await client.rpc('room_update_round', {
    p_code: normalizeRoomCode(code),
    p_id: id,
    p_payload: payload,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true, data: data as RoomRoundRecord };
}

export async function deleteRound(code: string, id: number): Promise<RoomResult<boolean>> {
  if (!roomServiceConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const client = getRoomClient();
  if (!client) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await client.rpc('room_delete_round', {
    p_code: normalizeRoomCode(code),
    p_id: id,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true, data: Boolean(data) };
}

export async function updateRoomMeta(code: string, meta: RoomMeta): Promise<RoomResult<boolean>> {
  if (!roomServiceConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const client = getRoomClient();
  if (!client) return { ok: false, error: NOT_CONFIGURED };

  const { error } = await client.rpc('room_set_meta', {
    p_code: normalizeRoomCode(code),
    p_meta: meta,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true, data: true };
}
