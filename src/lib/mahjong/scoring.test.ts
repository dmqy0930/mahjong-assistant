import { describe, expect, it } from 'vitest';
import { computeScoreChanges, type ScoreChangeInput } from './scoring';
import { calculatePoints } from './calculator';
import type { WinHandInput } from './types';

function input(overrides: Partial<ScoreChangeInput> = {}): ScoreChangeInput {
  return {
    basicPoints: 2000,
    isDealer: false,
    isTsumo: false,
    playerCount: 4,
    honba: 0,
    kyoutaku: 0,
    winnerIndex: 1,
    dealerIndex: 0,
    loserIndex: 2,
    ...overrides,
  };
}

const sum = (deltas: number[]) => deltas.reduce((a, b) => a + b, 0);

describe('四麻授受', () => {
  it('闲家荣和满贯：放铳者付 8000', () => {
    const r = computeScoreChanges(input());
    expect(r.deltas[2]).toBe(-8000);
    expect(r.deltas[1]).toBe(8000);
    expect(sum(r.deltas)).toBe(0);
  });

  it('庄家荣和满贯：放铳者付 12000', () => {
    const r = computeScoreChanges(input({ isDealer: true, winnerIndex: 0 }));
    expect(r.deltas[2]).toBe(-12000);
    expect(sum(r.deltas)).toBe(0);
  });

  it('闲家自摸满贯：庄家 4000、闲家各 2000', () => {
    const r = computeScoreChanges(input({ isTsumo: true, winnerIndex: 1, dealerIndex: 0 }));
    expect(r.payments).toEqual([
      { index: 0, amount: 4000 },
      { index: 2, amount: 2000 },
      { index: 3, amount: 2000 },
    ]);
    expect(r.deltas[1]).toBe(8000);
    expect(sum(r.deltas)).toBe(0);
  });

  it('庄家自摸满贯：每家 4000', () => {
    const r = computeScoreChanges(
      input({ isTsumo: true, isDealer: true, winnerIndex: 0, dealerIndex: 0 }),
    );
    expect(r.payments.every(p => p.amount === 4000)).toBe(true);
    expect(r.deltas[0]).toBe(12000);
    expect(sum(r.deltas)).toBe(0);
  });

  it('本场加成：荣和每本 300，自摸每本每家 100', () => {
    const ron = computeScoreChanges(input({ honba: 2 }));
    expect(ron.deltas[2]).toBe(-8600);

    const tsumo = computeScoreChanges(input({ isTsumo: true, honba: 2 }));
    expect(tsumo.payments).toEqual([
      { index: 0, amount: 4200 },
      { index: 2, amount: 2200 },
      { index: 3, amount: 2200 },
    ]);
  });

  it('供托归和牌者，总额多出供托部分', () => {
    const r = computeScoreChanges(input({ kyoutaku: 2 }));
    expect(r.deltas[1]).toBe(10000);
    expect(sum(r.deltas)).toBe(2000);
  });
});

describe('三麻授受', () => {
  const base: Partial<ScoreChangeInput> = { playerCount: 3, winnerIndex: 1, dealerIndex: 0 };

  it('折半：闲家自摸拿满四麻总额，两家平摊', () => {
    const r = computeScoreChanges(
      input({ ...base, isTsumo: true, threePlayerTsumoRule: 'split-half' }),
    );
    expect(r.payments).toEqual([
      { index: 0, amount: 4000 },
      { index: 2, amount: 4000 },
    ]);
    expect(r.deltas[1]).toBe(8000);
  });

  it('折半：庄家自摸拿满四麻总额', () => {
    const r = computeScoreChanges(
      input({
        playerCount: 3,
        isTsumo: true,
        isDealer: true,
        winnerIndex: 0,
        dealerIndex: 0,
        threePlayerTsumoRule: 'split-half',
      }),
    );
    expect(r.deltas[0]).toBe(12000);
    expect(r.payments.every(p => p.amount === 6000)).toBe(true);
  });

  it('ツモ損：按四麻比例收，总额少于折半', () => {
    const r = computeScoreChanges(
      input({ ...base, isTsumo: true, threePlayerTsumoRule: 'tsumo-loss' }),
    );
    expect(r.payments).toEqual([
      { index: 0, amount: 4000 },
      { index: 2, amount: 2000 },
    ]);
    expect(r.deltas[1]).toBe(6000);
  });

  it('千点加符：每家多付 1000', () => {
    const r = computeScoreChanges(
      input({ ...base, isTsumo: true, threePlayerTsumoRule: 'thousand-bonus' }),
    );
    expect(r.payments).toEqual([
      { index: 0, amount: 5000 },
      { index: 2, amount: 3000 },
    ]);
  });

  it('荣和与四麻一致，只有两家参与', () => {
    const r = computeScoreChanges(input({ ...base, loserIndex: 2 }));
    expect(r.deltas).toEqual([0, 8000, -8000]);
    expect(sum(r.deltas)).toBe(0);
  });

  it('三麻各家收支始终平衡（无供托时）', () => {
    for (const rule of ['split-half', 'tsumo-loss', 'thousand-bonus'] as const) {
      const r = computeScoreChanges(input({ ...base, isTsumo: true, threePlayerTsumoRule: rule }));
      expect(sum(r.deltas)).toBe(0);
    }
  });
});

describe('与 calculatePoints 串联', () => {
  it('满贯手牌 → 三麻折半自摸 4000/4000', () => {
    const result = calculatePoints({
      handTiles: [],
      openMentsu: [],
      janto: null,
      mentsu: [],
      winTile: { suit: 'man', rank: 1 },
      winType: 'normal',
      agariType: 'tsumo',
      isMenzen: true,
      isTsumo: true,
      isDealer: false,
      playerWind: 'south',
      baWind: 'east',
      doraTiles: [],
      uraDoraTiles: [],
      redDoraCount: 0,
      isRiichi: false,
      isDoubleRiichi: false,
      isIppatsu: false,
      isMenzenTsumo: false,
      isLastTile: false,
      isLastDraw: false,
      isFirstDraw: false,
      isTenhou: false,
      isChiihou: false,
      honba: 0,
      kyoutaku: 0,
      tenpaiType: 'ryanmen',
      selectedYaku: ['riichi', 'tanyao', 'pinfu', 'iipeikou', 'menzen_tsumo'],
      isFuriten: false,
    } as WinHandInput);

    expect(result.basicPoints).toBe(2000);

    const changes = computeScoreChanges({
      basicPoints: result.basicPoints,
      isDealer: false,
      isTsumo: true,
      playerCount: 3,
      threePlayerTsumoRule: 'split-half',
      honba: 0,
      kyoutaku: 0,
      winnerIndex: 1,
      dealerIndex: 0,
    });
    expect(changes.payments).toEqual([
      { index: 0, amount: 4000 },
      { index: 2, amount: 4000 },
    ]);
  });
});
