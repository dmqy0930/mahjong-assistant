import { describe, expect, it } from 'vitest';
import { analyzeHand } from './hand';
import { calculatePoints } from './calculator';
import type { BaWind, Mentsu, PlayerWind, Tile, WinHandInput } from './types';

/**
 * 简写牌谱：数字 + 花色字母（m/p/s），z 表示字牌（1=东 2=南 3=西 4=北 5=白 6=发 7=中）
 * 例：'123m456p11z'
 */
function t(notation: string): Tile[] {
  const tiles: Tile[] = [];
  let ranks: number[] = [];
  for (const ch of notation) {
    if (ch >= '1' && ch <= '9') {
      ranks.push(Number(ch));
      continue;
    }
    const suit: Tile['suit'] =
      ch === 'm' ? 'man' : ch === 'p' ? 'pin' : ch === 's' ? 'sou' : 'honor';
    for (const rank of ranks) tiles.push({ suit, rank });
    ranks = [];
  }
  return tiles;
}

const honor = (rank: number): Tile => ({ suit: 'honor', rank });
const man = (rank: number): Tile => ({ suit: 'man', rank });

interface AnalyzeOptions {
  hand: string;
  win: Tile;
  agariType?: 'tsumo' | 'ron';
  isMenzen?: boolean;
  openMentsu?: Mentsu[];
  playerWind?: PlayerWind;
  baWind?: BaWind;
}

function analyze(options: AnalyzeOptions) {
  return analyzeHand({
    handTiles: t(options.hand),
    openMentsu: options.openMentsu ?? [],
    winTile: options.win,
    agariType: options.agariType ?? 'ron',
    isMenzen: options.isMenzen ?? true,
    playerWind: options.playerWind ?? 'east',
    baWind: options.baWind ?? 'south',
  });
}

describe('analyzeHand 和牌形判定', () => {
  it('识别不到和牌形时给出提示', () => {
    const result = analyze({ hand: '123m456m789m11p344p', win: man(4) });
    expect(result.isAgari).toBe(false);
    expect(result.message).toContain('未识别到和牌形');
  });

  it('张数不符时给出提示', () => {
    const result = analyze({ hand: '123m456m789m11p', win: man(1) });
    expect(result.isAgari).toBe(false);
    expect(result.message).toContain('张');
  });

  it('拆解出 4 面子 + 1 雀头', () => {
    const result = analyze({ hand: '234m567m234p567p88s', win: man(4) });
    expect(result.isAgari).toBe(true);
    expect(result.mentsu).toHaveLength(4);
    expect(result.janto?.tiles).toHaveLength(2);
  });
});

describe('analyzeHand 役种自动判定', () => {
  it('平和 + 断幺九，两面听', () => {
    const result = analyze({ hand: '234m567m234p567p88s', win: man(4) });
    expect(result.tenpaiType).toBe('ryanmen');
    expect(result.yakuIds).toContain('pinfu');
    expect(result.yakuIds).toContain('tanyao');
    expect(result.yakuIds).not.toContain('yakuhaku_jikaze');
  });

  it('平和荣和的点数为 30符2番 2000点', () => {
    const result = analyze({ hand: '234m567m234p567p88s', win: man(4) });
    const points = calculatePoints(toInput(result, man(4)));
    expect(points.fu).toBe(30);
    expect(points.totalHan).toBe(2);
    expect(points.points.non_dealer_ron).toBe(2000);
  });

  it('三色同顺', () => {
    const result = analyze({ hand: '123m456m123p123s99p', win: { suit: 'pin', rank: 9 } });
    expect(result.yakuIds).toContain('sanshoku_doujun');
    expect(result.tenpaiType).toBe('tanki');
  });

  it('一气通贯 + 混一色', () => {
    const result = analyze({ hand: '123m456m789m111m77z', win: man(9) });
    expect(result.yakuIds).toContain('ikkitsuukan');
    expect(result.yakuIds).toContain('honitsu');
  });

  it('役牌（自风）与门清自摸', () => {
    const result = analyze({
      hand: '111z234m567p88s333s',
      win: honor(1),
      agariType: 'tsumo',
      playerWind: 'east',
    });
    expect(result.yakuIds).toContain('yakuhaku_jikaze');
    expect(result.yakuIds).toContain('menzen_tsumo');
  });

  it('七对子', () => {
    const result = analyze({ hand: '1122m3344p5566s77z', win: honor(7) });
    expect(result.winType).toBe('chitoitsu');
    expect(result.yakuIds).toContain('chitoitsu');
  });

  it('国士无双十三面为双倍役满', () => {
    const result = analyze({ hand: '119m19p19s1234567z', win: man(1) });
    expect(result.winType).toBe('kokushi');
    expect(result.yakuIds).toContain('kokushi_juusanmen');
  });

  it('国士无双（非十三面）', () => {
    const result = analyze({ hand: '119m19p19s1234567z', win: { suit: 'pin', rank: 9 } });
    expect(result.yakuIds).toContain('kokushi');
    expect(result.yakuIds).not.toContain('kokushi_juusanmen');
  });

  it('四暗刻单骑', () => {
    const result = analyze({ hand: '111m222p333s444p55z', win: honor(5) });
    expect(result.yakuIds).toContain('suuankou_tanki');
  });

  it('大三元', () => {
    const result = analyze({ hand: '123m99p555z666z777z', win: honor(7) });
    expect(result.yakuIds).toContain('daisangen');
  });

  it('副露役牌仍然成立，但门清役不再计入', () => {
    const openMentsu: Mentsu[] = [
      { type: 'koutsu', tiles: [honor(7), honor(7), honor(7)], isOpen: true },
    ];
    const result = analyze({
      hand: '234m567m234p88p',
      win: man(4),
      isMenzen: false,
      openMentsu,
    });
    expect(result.isAgari).toBe(true);
    expect(result.yakuIds).toContain('yakuhaku_chun');
    expect(result.yakuIds).not.toContain('pinfu');
    expect(result.yakuIds).not.toContain('tanyao');
  });
});

/** 把 analyzeHand 的结果塞进 WinHandInput，便于验证点数 */
function toInput(
  analysis: ReturnType<typeof analyzeHand>,
  winTile: Tile,
  hand = '234m567m234p567p88s',
): WinHandInput {
  return {
    handTiles: t(hand),
    openMentsu: [],
    janto: analysis.janto,
    mentsu: analysis.mentsu,
    winTile,
    winType: analysis.winType ?? 'normal',
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
    tenpaiType: analysis.tenpaiType,
    selectedYaku: analysis.yakuIds,
    isFuriten: false,
  };
}
