'use client';

import { getRoomClient, roomServiceConfigured } from './client';
import {
  normalizeMeta,
  normalizeRoomCode,
  type PendingMember,
  type RoomMemberInfo,
  type RoomMeta,
  type RoomRoundRecord,
  type RoundPayload,
} from './types';

export interface RoomResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface RoomStatus {
  room: { code: string; created_at: string; updated_at: string; meta: RoomMeta } | null;
  rounds: RoomRoundRecord[];
  member: RoomMemberInfo | null;
}

const NOT_CONFIGURED = '房间服务未配置：请先在部署平台设置 SUPABASE 相关环境变量';

function friendly(message: string): string {
  if (message.includes('room_not_found')) return '房间不存在或已被删除';
  if (message.includes('round_not_found')) return '这一局已经不存在了，可能被其他人删除';
  if (message.includes('code_taken')) return '这个房间号已经被占用，换一个吧';
  if (message.includes('invalid_code_format')) return '房间号需要 6 位字母数字（不含 I、O、0、1）';
  if (message.includes('pending_approval')) return '还在等待房主审核';
  if (message.includes('join_rejected')) return '你的加入申请被拒绝了';
  if (message.includes('not_a_member')) return '你还不是这个房间的成员，请先申请加入';
  if (message.includes('not_host')) return '只有房主可以做这个操作';
  if (message.toLowerCase().includes('failed to fetch')) return '网络异常，请检查网络后重试';
  return message;
}

function client() {
  if (!roomServiceConfigured()) return null;
  return getRoomClient();
}

export async function createRoom(
  meta: RoomMeta,
  code: string,
  token: string,
  nickname: string,
): Promise<RoomResult<string>> {
  const rpc = client();
  if (!rpc) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await rpc.rpc('create_room', {
    p_meta: meta,
    p_code: normalizeRoomCode(code),
    p_token: token,
    p_nickname: nickname,
  });
  if (error) return { ok: false, error: friendly(error.message) };

  const result = (data ?? {}) as { code?: string };
  return { ok: true, data: normalizeRoomCode(result.code ?? code) };
}

export async function fetchRoomStatus(code: string, token: string): Promise<RoomResult<RoomStatus>> {
  const rpc = client();
  if (!rpc) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await rpc.rpc('room_status', {
    p_code: normalizeRoomCode(code),
    p_token: token,
  });
  if (error) return { ok: false, error: friendly(error.message) };

  const raw = (data ?? {}) as {
    room?: ({ meta?: unknown } & Record<string, unknown>) | null;
    rounds?: unknown;
    member?: RoomMemberInfo | null;
  };

  return {
    ok: true,
    data: {
      room: raw.room ? ({ ...raw.room, meta: normalizeMeta(raw.room.meta) } as RoomStatus['room']) : null,
      rounds: Array.isArray(raw.rounds) ? (raw.rounds as RoomRoundRecord[]) : [],
      member: raw.member ?? null,
    },
  };
}

export async function requestJoin(
  code: string,
  token: string,
  nickname: string,
): Promise<RoomResult<RoomMemberInfo>> {
  const rpc = client();
  if (!rpc) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await rpc.rpc('room_request_join', {
    p_code: normalizeRoomCode(code),
    p_token: token,
    p_nickname: nickname,
  });
  if (error) return { ok: false, error: friendly(error.message) };

  const raw = (data ?? {}) as { status?: RoomMemberInfo['status']; isHost?: boolean };
  return {
    ok: true,
    data: { status: raw.status ?? 'pending', isHost: Boolean(raw.isHost) },
  };
}

export async function listPendingMembers(
  code: string,
  token: string,
): Promise<RoomResult<PendingMember[]>> {
  const rpc = client();
  if (!rpc) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await rpc.rpc('room_pending_members', {
    p_code: normalizeRoomCode(code),
    p_token: token,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true, data: Array.isArray(data) ? (data as PendingMember[]) : [] };
}

export async function decideMember(
  code: string,
  memberId: number,
  token: string,
  approve: boolean,
): Promise<RoomResult<boolean>> {
  const rpc = client();
  if (!rpc) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await rpc.rpc('room_decide_member', {
    p_code: normalizeRoomCode(code),
    p_member_id: memberId,
    p_token: token,
    p_approve: approve,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true, data: Boolean(data) };
}

export async function addRound(
  code: string,
  token: string,
  payload: RoundPayload,
): Promise<RoomResult<RoomRoundRecord>> {
  const rpc = client();
  if (!rpc) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await rpc.rpc('room_add_round', {
    p_code: normalizeRoomCode(code),
    p_token: token,
    p_payload: payload,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true, data: data as RoomRoundRecord };
}

export async function updateRound(
  code: string,
  token: string,
  id: number,
  payload: RoundPayload,
): Promise<RoomResult<RoomRoundRecord>> {
  const rpc = client();
  if (!rpc) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await rpc.rpc('room_update_round', {
    p_code: normalizeRoomCode(code),
    p_token: token,
    p_id: id,
    p_payload: payload,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true, data: data as RoomRoundRecord };
}

export async function deleteRound(
  code: string,
  token: string,
  id: number,
): Promise<RoomResult<boolean>> {
  const rpc = client();
  if (!rpc) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await rpc.rpc('room_delete_round', {
    p_code: normalizeRoomCode(code),
    p_token: token,
    p_id: id,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true, data: Boolean(data) };
}

export async function updateRoomMeta(
  code: string,
  token: string,
  meta: RoomMeta,
): Promise<RoomResult<boolean>> {
  const rpc = client();
  if (!rpc) return { ok: false, error: NOT_CONFIGURED };

  const { error } = await rpc.rpc('room_set_meta', {
    p_code: normalizeRoomCode(code),
    p_token: token,
    p_meta: meta,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true, data: true };
}
