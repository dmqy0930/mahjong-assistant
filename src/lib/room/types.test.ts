import { describe, expect, it } from 'vitest';
import {
  computeStandings,
  getRoomToken,
  isValidRoomCode,
  normalizeMeta,
  normalizeRoomCode,
  randomRoomCode,
  type RoomRoundRecord,
  type RoundPayload,
} from './types';

function round(seq: number, points: number[]): RoomRoundRecord {
  const payload: RoundPayload = {
    roundName: `第${seq}局`,
    winnerIndex: 1,
    loserIndex: 2,
    isTsumo: false,
    honba: 0,
    kyoutaku: 0,
    han: 1,
    fu: 30,
    yakuText: '',
    points,
  };
  return {
    id: seq,
    seq,
    payload,
    created_by: '',
    created_at: '',
    updated_at: '',
  };
}

describe('房间号处理', () => {
  it('统一大写并去掉空格与连字符', () => {
    expect(normalizeRoomCode(' ab-12 cd ')).toBe('AB12CD');
  });

  it('6 位字母数字视为合法', () => {
    expect(isValidRoomCode('ABC234')).toBe(true);
  });

  it('长度不对或含 I/O/0/1 视为非法', () => {
    expect(isValidRoomCode('ABC23')).toBe(false);
    expect(isValidRoomCode('ABCI23')).toBe(false);
    expect(isValidRoomCode('ABC023')).toBe(false);
  });
});

describe('randomRoomCode', () => {
  it('生成的房间号合法且不含易混淆字符', () => {
    for (let i = 0; i < 50; i++) {
      const code = randomRoomCode();
      expect(code).toHaveLength(6);
      expect(isValidRoomCode(code)).toBe(true);
      expect(code).not.toMatch(/[IO01]/);
    }
  });
});

describe('getRoomToken', () => {
  function installStorage() {
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    };
  }

  it('同一房间始终返回同一个凭证', () => {
    installStorage();
    const first = getRoomToken('abc234');
    expect(first).not.toBe('');
    expect(getRoomToken('ABC234')).toBe(first);
  });

  it('不同房间使用不同凭证', () => {
    installStorage();
    expect(getRoomToken('ABC234')).not.toBe(getRoomToken('ABC235'));
  });
});

describe('computeStandings', () => {
  const meta = normalizeMeta({ playerNames: ['A', 'B', 'C', 'D'], startScore: 25000 });

  it('没有对局时全部是起始分', () => {
    const standings = computeStandings(meta, []);
    expect(standings.map(s => s.score)).toEqual([25000, 25000, 25000, 25000]);
  });

  it('按累计点数排序', () => {
    const standings = computeStandings(meta, [round(1, [0, 3900, -3900, 0])]);
    expect(standings[0].name).toBe('B');
    expect(standings[0].score).toBe(28900);
    expect(standings[3].name).toBe('C');
    expect(standings[3].score).toBe(21100);
  });

  it('多局累计', () => {
    const standings = computeStandings(meta, [
      round(1, [0, 3900, -3900, 0]),
      round(2, [-1000, -1000, -1000, 3000]),
    ]);
    const byName = Object.fromEntries(standings.map(s => [s.name, s.score]));
    expect(byName.B).toBe(27900);
    expect(byName.D).toBe(28000);
  });

  it('点数数组长度不足时不会崩', () => {
    const standings = computeStandings(meta, [round(1, [0, 1000])]);
    expect(standings).toHaveLength(4);
    expect(standings.find(s => s.name === 'B')?.score).toBe(26000);
  });
});

describe('normalizeMeta', () => {
  it('补齐缺失字段', () => {
    const meta = normalizeMeta({ playerCount: 3 });
    expect(meta.playerCount).toBe(3);
    expect(meta.playerNames).toHaveLength(3);
    expect(meta.playerNames).toEqual(['玩家1', '玩家2', '玩家3']);
    expect(meta.startScore).toBe(25000);
  });

  it('玩家人数多于人数设置时截断', () => {
    const meta = normalizeMeta({ playerCount: 3, playerNames: ['A', 'B', 'C', 'D'] });
    expect(meta.playerNames).toEqual(['A', 'B', 'C']);
  });

  it('空名字回落为默认名', () => {
    const meta = normalizeMeta({ playerCount: 4, playerNames: ['A', '', 'C', ''] });
    expect(meta.playerNames).toEqual(['A', '玩家2', 'C', '玩家4']);
  });

  it('完全非法输入也能得到可用结构', () => {
    const meta = normalizeMeta(null);
    expect(meta.playerCount).toBe(4);
    expect(meta.playerNames).toHaveLength(4);
  });
});
