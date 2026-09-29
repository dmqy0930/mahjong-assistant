import { describe, expect, it } from 'vitest';
import {
  calculateFu,
  calculatePoints,
  countDora,
  countYakumanMultiplier,
  getDoraFromIndicator,
} from './calculator';
import type { Mentsu, Tile, WinHandInput } from './types';

const tile = (suit: Tile['suit'], rank: number): Tile => ({ suit, rank });

function baseInput(overrides: Partial<WinHandInput> = {}): WinHandInput {
  return {
    handTiles: [],
    openMentsu: [],
    janto: null,
    mentsu: [],
    winTile: tile('man', 1),
    winType: 'normal',
    agariType: 'ron',
    isMenzen: true,
    isTsumo: false,
    isDealer: false,
    playerWind: 'east',
    baWind: 'south',
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
    selectedYaku: [],
    isFuriten: false,
    ...overrides,
  };
}

const koutsu = (t: Tile, isOpen = false): Mentsu => ({
  type: 'koutsu',
  tiles: [t, t, t],
  isOpen,
});

const kantsu = (t: Tile, isOpen = false): Mentsu => ({
  type: 'kantsu',
  tiles: [t, t, t, t],
  isOpen,
});

describe('getDoraFromIndicator', () => {
  it('数牌循环 9 → 1', () => {
    expect(getDoraFromIndicator(tile('man', 9))).toEqual(tile('man', 1));
    expect(getDoraFromIndicator(tile('pin', 4))).toEqual(tile('pin', 5));
  });

  it('风牌 北 → 东', () => {
    expect(getDoraFromIndicator(tile('honor', 4))).toEqual(tile('honor', 1));
    expect(getDoraFromIndicator(tile('honor', 2))).toEqual(tile('honor', 3));
  });

  it('三元牌 中 → 白', () => {
    expect(getDoraFromIndicator(tile('honor', 7))).toEqual(tile('honor', 5));
    expect(getDoraFromIndicator(tile('honor', 5))).toEqual(tile('honor', 6));
  });
});

describe('countDora', () => {
  it('赤5 同时算作 5 的宝牌', () => {
    const hand = [tile('man', 5), { ...tile('man', 5), isRed: true }];
    expect(countDora(hand, [tile('man', 5)])).toBe(2);
  });
});

describe('calculateFu', () => {
  it('七对子固定 25 符', () => {
    expect(calculateFu(baseInput({ winType: 'chitoitsu' }))).toBe(25);
  });

  it('平和自摸 20 符', () => {
    const fu = calculateFu(
      baseInput({
        isTsumo: true,
        tenpaiType: 'ryanmen',
        selectedYaku: ['pinfu'],
      }),
    );
    expect(fu).toBe(20);
  });

  it('门清荣和底符 30 符', () => {
    expect(calculateFu(baseInput({ selectedYaku: ['riichi'] }))).toBe(30);
  });

  it('副露荣和最低 30 符', () => {
    expect(calculateFu(baseInput({ isMenzen: false, selectedYaku: ['tanyao'] }))).toBe(30);
  });

  it('暗刻 + 自风雀头 → 40 符', () => {
    const fu = calculateFu(
      baseInput({
        mentsu: [koutsu(tile('man', 1))],
        janto: { tiles: [tile('honor', 1), tile('honor', 1)] },
        playerWind: 'east',
        baWind: 'south',
      }),
    );
    expect(fu).toBe(40);
  });

  it('暗杠幺九 + 暗刻中张 → 70 符', () => {
    const fu = calculateFu(
      baseInput({
        mentsu: [kantsu(tile('man', 1)), koutsu(tile('pin', 9))],
        janto: { tiles: [tile('honor', 1), tile('honor', 1)] },
        playerWind: 'south',
        baWind: 'south',
      }),
    );
    expect(fu).toBe(70);
  });
});

describe('calculatePoints 点数表', () => {
  const ron = (overrides: Partial<WinHandInput> = {}) =>
    calculatePoints(baseInput({ selectedYaku: ['riichi'], ...overrides }));

  it('30符1番 = 1000点（闲家荣和）', () => {
    expect(ron().points.non_dealer_ron).toBe(1000);
  });

  it('30符1番 = 1500点（庄家荣和）', () => {
    expect(ron({ isDealer: true }).points.dealer_ron).toBe(1500);
  });

  it('40符2番 = 2600点', () => {
    const result = calculatePoints(
      baseInput({
        mentsu: [koutsu(tile('man', 1))],
        janto: { tiles: [tile('honor', 1), tile('honor', 1)] },
        playerWind: 'east',
        baWind: 'south',
        selectedYaku: ['riichi', 'tanyao'],
      }),
    );
    expect(result.fu).toBe(40);
    expect(result.totalHan).toBe(2);
    expect(result.points.non_dealer_ron).toBe(2600);
  });

  it('3番70符 = 满贯 8000点', () => {
    const result = calculatePoints(
      baseInput({
        mentsu: [kantsu(tile('man', 1)), koutsu(tile('pin', 9))],
        janto: { tiles: [tile('honor', 1), tile('honor', 1)] },
        playerWind: 'south',
        baWind: 'south',
        selectedYaku: ['riichi', 'tanyao', 'pinfu'],
      }),
    );
    expect(result.fu).toBe(70);
    expect(result.limitType).toBe('mangan');
    expect(result.points.non_dealer_ron).toBe(8000);
  });

  it('5番 = 满贯 8000点，庄家 12000点', () => {
    const result = calculatePoints(
      baseInput({
        selectedYaku: ['riichi', 'tanyao', 'pinfu', 'iipeikou', 'menzen_tsumo'],
      }),
    );
    expect(result.totalHan).toBe(5);
    expect(result.limitType).toBe('mangan');
    expect(result.points.non_dealer_ron).toBe(8000);
    expect(result.points.dealer_ron).toBe(12000);
  });

  it('6番 = 跳满 12000点', () => {
    const result = calculatePoints(
      baseInput({
        selectedYaku: ['chinitsu'],
        isMenzen: true,
      }),
    );
    expect(result.totalHan).toBe(6);
    expect(result.limitType).toBe('haneman');
    expect(result.points.non_dealer_ron).toBe(12000);
  });

  it('9番 = 倍满 16000点', () => {
    const result = calculatePoints(
      baseInput({ selectedYaku: ['chinitsu', 'honitsu'] }),
    );
    // chinitsu 6 + honitsu 3 = 9 番 → 倍满
    expect(result.totalHan).toBe(9);
    expect(result.points.non_dealer_ron).toBe(16000);
  });

  it('13番 = 役满 32000点，庄家 48000点', () => {
    const result = calculatePoints(baseInput({ selectedYaku: ['kokushi'] }));
    expect(result.isYakuman).toBe(true);
    expect(result.points.non_dealer_ron).toBe(32000);
    expect(result.points.dealer_ron).toBe(48000);
  });

  it('役满自摸：庄家每家 16000点', () => {
    const result = calculatePoints(
      baseInput({ selectedYaku: ['kokushi'], isTsumo: true, isDealer: true }),
    );
    expect(result.points.dealer_tsumo).toBe(16000);
  });

  it('双倍役满（大四喜）= 64000点', () => {
    const result = calculatePoints(baseInput({ selectedYaku: ['daisuushii'] }));
    expect(result.points.non_dealer_ron).toBe(64000);
  });

  it('三倍役满（大四喜 + 字一色）= 96000点', () => {
    const result = calculatePoints(
      baseInput({ selectedYaku: ['daisuushii', 'tsuiisou'] }),
    );
    expect(result.points.non_dealer_ron).toBe(96000);
  });
});

describe('役与宝牌', () => {
  it('只有宝牌时 hasYaku 为 false', () => {
    const result = calculatePoints(
      baseInput({
        handTiles: [tile('man', 5), tile('man', 5)],
        doraTiles: [tile('man', 5)],
      }),
    );
    expect(result.hasYaku).toBe(false);
    expect(result.doraCount).toBe(2);
  });

  it('副露时门清限定役不计番', () => {
    const result = calculatePoints(
      baseInput({ isMenzen: false, selectedYaku: ['pinfu', 'riichi'] }),
    );
    expect(result.totalHan).toBe(0);
    expect(result.hasYaku).toBe(false);
  });

  it('赤宝牌计入番数', () => {
    const result = calculatePoints(
      baseInput({ selectedYaku: ['tanyao'], redDoraCount: 2 }),
    );
    expect(result.doraCount).toBe(2);
    expect(result.totalHan).toBe(3);
  });
});

describe('countYakumanMultiplier', () => {
  it('每 13 番算 1 倍役满', () => {
    expect(countYakumanMultiplier(13)).toBe(1);
    expect(countYakumanMultiplier(26)).toBe(2);
    expect(countYakumanMultiplier(39)).toBe(3);
  });
});
