import type { PlayerCount, ThreePlayerTsumoRule } from '@/lib/mahjong/scoring';

/** 房间设置，建局时确定 */
export interface RoomMeta {
  playerNames: string[];
  playerCount: PlayerCount;
  threePlayerTsumoRule: ThreePlayerTsumoRule;
  startScore: number;
}

/** 一局的完整记录 */
export interface RoundPayload {
  roundName: string;
  winnerIndex: number | null;
  loserIndex: number | null;
  isTsumo: boolean;
  honba: number;
  kyoutaku: number;
  han: number;
  fu: number;
  yakuText: string;
  /** 各家点数增减 */
  points: number[];
}

export interface RoomRoundRecord {
  id: number;
  seq: number;
  payload: RoundPayload;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RoomRecord {
  code: string;
  created_at: string;
  updated_at: string;
  meta: RoomMeta;
}

export interface RoomSnapshot {
  room: RoomRecord | null;
  rounds: RoomRoundRecord[];
}

export const DEFAULT_ROOM_META: RoomMeta = {
  playerNames: ['玩家1', '玩家2', '玩家3', '玩家4'],
  playerCount: 4,
  threePlayerTsumoRule: 'split-half',
  startScore: 25000,
};

/** 房间号字母表：排除容易看错的 I O 0 1，与 schema.sql 保持一致 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

const TOKEN_PREFIX = 'mahjong-room-token:';

function generateToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 房间凭证：首次进入某个房间时生成并存在本地，之后所有写操作都要带上它。
 * 它相当于「房间内的钥匙」，不绑定真实身份。
 */
export function getRoomToken(code: string): string {
  if (typeof window === 'undefined') return '';
  const key = TOKEN_PREFIX + normalizeRoomCode(code);
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const token = generateToken();
    window.localStorage.setItem(key, token);
    return token;
  } catch {
    return '';
  }
}

export type MemberStatus = 'pending' | 'approved' | 'rejected';

export interface RoomMemberInfo {
  status: MemberStatus;
  isHost: boolean;
  nickname?: string;
}

export interface PendingMember {
  id: number;
  nickname: string;
  createdAt: string;
}

/** 房间号统一大写、去掉空格与连字符，方便手抄与输入 */
export function normalizeRoomCode(input: string): string {
  return (input ?? '').toUpperCase().replace(/[\s-]/g, '');
}

export function isValidRoomCode(input: string): boolean {
  // 与 schema.sql 里生成房间号用的字母表保持一致：排除容易看错的 I O 0 1
  return /^[A-HJ-NP-Z2-9]{6}$/.test(normalizeRoomCode(input));
}

export interface Standing {
  index: number;
  name: string;
  score: number;
}

/** 按当前所有对局累计各家分数，并按高低排序 */
export function computeStandings(meta: RoomMeta, rounds: RoomRoundRecord[]): Standing[] {
  const standings: Standing[] = meta.playerNames.map((name, index) => ({
    index,
    name,
    score: meta.startScore,
  }));

  for (const round of rounds) {
    round.payload.points.forEach((delta, i) => {
      if (standings[i] && Number.isFinite(delta)) standings[i].score += delta;
    });
  }

  return standings.sort((a, b) => b.score - a.score);
}

/** 把任意来源的 meta 补齐成完整结构，避免旧数据缺字段导致界面崩溃 */
export function normalizeMeta(input: unknown): RoomMeta {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Partial<RoomMeta>;
  const playerCount: PlayerCount = raw.playerCount === 3 ? 3 : 4;
  const names = Array.isArray(raw.playerNames) ? raw.playerNames.map(String) : [];

  return {
    playerCount,
    threePlayerTsumoRule: raw.threePlayerTsumoRule ?? 'split-half',
    startScore: typeof raw.startScore === 'number' ? raw.startScore : DEFAULT_ROOM_META.startScore,
    playerNames: Array.from(
      { length: playerCount },
      (_, i) => names[i] || `玩家${i + 1}`,
    ),
  };
}
