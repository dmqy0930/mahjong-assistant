import type { CalcResult, Mentsu, Tile, WinHandInput, Yaku } from './types';
import { YAKU_LIST } from './yaku';

// 判断牌是否为幺九牌
export function isYaochuu(tile: Tile): boolean {
  if (tile.suit === 'honor') return true;
  return tile.rank === 1 || tile.rank === 9;
}

// 判断牌是否为字牌
export function isHonor(tile: Tile): boolean {
  return tile.suit === 'honor';
}

// 判断牌是否为三元牌
export function isDragon(tile: Tile): boolean {
  return tile.suit === 'honor' && tile.rank >= 5 && tile.rank <= 7;
}

// 判断牌是否为风牌
export function isWind(tile: Tile): boolean {
  return tile.suit === 'honor' && tile.rank >= 1 && tile.rank <= 4;
}

// 判断牌是否为绿色牌（绿一色用）
export function isGreen(tile: Tile): boolean {
  if (tile.suit === 'sou' && [2, 3, 4, 6, 8].includes(tile.rank)) return true;
  if (tile.suit === 'honor' && tile.rank === 6) return true; // 发
  return false;
}

// 获取牌的字符串表示
export function tileToString(tile: Tile): string {
  if (tile.suit === 'man') return `${tile.rank}m`;
  if (tile.suit === 'pin') return `${tile.rank}p`;
  if (tile.suit === 'sou') return `${tile.rank}s`;
  const honorNames = ['', 'east', 'south', 'west', 'north', 'haku', 'hatsu', 'chun'];
  return honorNames[tile.rank] || '?';
}

const WIND_RANK: Record<string, number> = { east: 1, south: 2, west: 3, north: 4 };

/**
 * 由宝牌指示牌推出宝牌本身。
 * 数牌 1→2→…→9→1；风牌 东→南→西→北→东；三元牌 白→发→中→白。
 */
export function getDoraFromIndicator(indicator: Tile): Tile {
  if (indicator.suit === 'honor') {
    const rank = indicator.rank;
    if (rank >= 1 && rank <= 4) {
      return { suit: 'honor', rank: (rank % 4) + 1 };
    }
    if (rank >= 5 && rank <= 7) {
      return { suit: 'honor', rank: ((rank - 5 + 1) % 3) + 5 };
    }
    return { suit: 'honor', rank };
  }
  return { suit: indicator.suit, rank: indicator.rank === 9 ? 1 : indicator.rank + 1 };
}

/** 批量把宝牌指示牌转换成宝牌 */
export function getDoraTilesFromIndicators(indicators: Tile[]): Tile[] {
  return indicators.map(getDoraFromIndicator);
}

/** 计算宝牌张数（入参为宝牌本身；赤5同样算作5的宝牌） */
export function countDora(handTiles: Tile[], doraTiles: Tile[]): number {
  let count = 0;
  for (const tile of handTiles) {
    for (const dora of doraTiles) {
      if (tile.suit === dora.suit && tile.rank === dora.rank) count++;
    }
  }
  return count;
}

// 计算赤宝牌数
export function countRedDora(handTiles: Tile[]): number {
  return handTiles.filter(t => t.isRed).length;
}

/** 某张牌是否为役牌（三元牌 / 自风 / 场风） */
export function isYakuhaiTile(tile: Tile, playerWind: string, baWind: string): boolean {
  if (isDragon(tile)) return true;
  if (!isWind(tile)) return false;
  return tile.rank === WIND_RANK[playerWind] || tile.rank === WIND_RANK[baWind];
}

/** 计算雀头符 */
export function calcJantoFu(jantoTile: Tile, playerWind: string, baWind: string): number {
  let fu = 0;
  if (isDragon(jantoTile)) fu += 2;
  if (isWind(jantoTile)) {
    if (jantoTile.rank === WIND_RANK[playerWind]) fu += 2;
    if (jantoTile.rank === WIND_RANK[baWind]) fu += 2;
  }
  return fu;
}

/** 计算单个面子的符数 */
export function calcMentsuFu(mentsu: Mentsu): number {
  if (mentsu.type === 'shuntsu') return 0;
  let fu = mentsu.type === 'koutsu' ? (mentsu.isOpen ? 2 : 4) : mentsu.isOpen ? 8 : 16;
  if (isYaochuu(mentsu.tiles[0])) fu *= 2;
  return fu;
}

// 计算符数
export function calculateFu(input: WinHandInput): number {
  // 七对子固定25符
  if (input.winType === 'chitoitsu') return 25;
  // 国士无双无符数概念
  if (input.winType === 'kokushi') return 0;

  const isPinfuTsumo =
    input.isMenzen && input.isTsumo && input.selectedYaku.includes('pinfu');

  let fu = 20; // 底符

  // 门清荣和 +10符
  if (input.isMenzen && !input.isTsumo) fu += 10;
  // 自摸 +2符（平和自摸不算）
  if (input.isTsumo && !isPinfuTsumo) fu += 2;

  // 雀头符
  if (input.janto) {
    fu += calcJantoFu(input.janto.tiles[0], input.playerWind, input.baWind);
  }

  // 面子符（手牌面子 + 副露面子）
  for (const mentsu of [...input.mentsu, ...input.openMentsu]) {
    fu += calcMentsuFu(mentsu);
  }

  // 听牌形符
  if (input.tenpaiType === 'kanchan') fu += 2;
  if (input.tenpaiType === 'penchan') fu += 2;
  if (input.tenpaiType === 'tanki') fu += 2;

  // 向上取整到10的倍数
  fu = Math.ceil(fu / 10) * 10;

  // 平和自摸固定20符，其余最低30符
  if (!isPinfuTsumo && fu < 30) fu = 30;

  return fu;
}

/** 役满倍数：每13番（即1个役满）算1倍 */
export function countYakumanMultiplier(yakumanHan: number): number {
  return Math.max(1, Math.floor(yakumanHan / 13));
}

// 计算基本点
function calculateBasicPoints(han: number, fu: number, yakumanHan: number): number {
  if (yakumanHan > 0) {
    return 8000 * countYakumanMultiplier(yakumanHan);
  }

  if (han >= 13) return 8000; // 数え役满
  if (han >= 11) return 6000; // 三倍满
  if (han >= 8) return 4000; // 倍满
  if (han >= 6) return 3000; // 跳满
  if (han >= 5) return 2000; // 满贯

  // 5番以下按基本点计算
  const basePoints = fu * Math.pow(2, han + 2);

  // 切上满贯（4番40符以上或3番70符以上）
  if (han === 4 && fu >= 40) return 2000;
  if (han === 3 && fu >= 70) return 2000;

  // 上限为满贯
  if (basePoints >= 2000) return 2000;

  return basePoints;
}

// 获取满贯类型
function getLimitType(han: number, fu: number, yakumanHan: number): CalcResult['limitType'] {
  if (yakumanHan > 0 || han >= 13) return 'yakuman';
  if (han >= 11) return 'sanbaiman';
  if (han >= 8) return 'baiman';
  if (han >= 6) return 'haneman';
  if (han >= 5) return 'mangan';
  if ((han === 4 && fu >= 40) || (han === 3 && fu >= 70)) return 'mangan';
  return 'none';
}

const ceil100 = (value: number) => Math.ceil(value / 100) * 100;

// 计算点数
export function calculatePoints(input: WinHandInput): CalcResult {
  let normalHan = 0;
  let yakumanHan = 0;
  const yakuList: { yaku: Yaku; han: number }[] = [];

  for (const yakuId of input.selectedYaku) {
    const yaku = YAKU_LIST.find(y => y.id === yakuId);
    if (!yaku) continue;

    const han = input.isMenzen ? yaku.han : yaku.hanOpen;
    if (han <= 0) continue;

    yakuList.push({ yaku, han });
    if (yaku.isYakuman) yakumanHan += han;
    else normalHan += han;
  }

  const hasYaku = yakuList.length > 0;

  // 宝牌（表/里/赤）只加番，不构成役
  const allTiles = [...input.handTiles];
  input.openMentsu.forEach(m => allTiles.push(...m.tiles));
  const doraCount = countDora(allTiles, input.doraTiles);
  const uraDoraCount = input.isRiichi ? countDora(allTiles, input.uraDoraTiles) : 0;
  const totalDora = doraCount + uraDoraCount + input.redDoraCount;

  // 役满手牌忽略普通役与宝牌的加算（但保留显示）
  const totalHan = yakumanHan > 0 ? yakumanHan + normalHan : normalHan + totalDora;

  const fu = yakumanHan > 0 || input.winType === 'kokushi' ? 0 : calculateFu(input);
  const basicPoints = calculateBasicPoints(normalHan, fu, yakumanHan);
  const limitType = getLimitType(normalHan, fu, yakumanHan);

  return {
    yakuList,
    totalHan,
    fu,
    points: {
      dealer_tsumo: ceil100(basicPoints * 2),
      non_dealer_tsumo_dealer: ceil100(basicPoints * 2),
      non_dealer_tsumo_non_dealer: ceil100(basicPoints * 1),
      dealer_ron: ceil100(basicPoints * 6),
      non_dealer_ron: ceil100(basicPoints * 4),
    },
    isYakuman: yakumanHan > 0,
    hasYaku,
    doraCount: totalDora,
    limitType,
  };
}

// 获取满贯类型名称
export function getLimitTypeName(limitType: CalcResult['limitType']): string {
  const names: Record<string, string> = {
    none: '',
    mangan: '满贯',
    haneman: '跳满',
    baiman: '倍满',
    sanbaiman: '三倍满',
    yakuman: '役满',
  };
  return names[limitType] || '';
}

// 获取最终点数文本
export function getPointsText(result: CalcResult, input: WinHandInput): string {
  const { points } = result;
  const extra: string[] = [];
  if (input.honba > 0) extra.push(`本场 ${input.honba * 300}点`);
  if (input.kyoutaku > 0) extra.push(`供托 ${input.kyoutaku * 1000}点`);
  const suffix = extra.length ? `（+${extra.join(' + ')}）` : '';

  if (input.isTsumo) {
    if (input.isDealer) return `自摸 ${points.dealer_tsumo}点 × 3${suffix}`;
    return `自摸 ${points.non_dealer_tsumo_non_dealer}/${points.non_dealer_tsumo_dealer}（闲家/庄家）${suffix}`;
  }
  return `荣和 ${input.isDealer ? points.dealer_ron : points.non_dealer_ron}点${suffix}`;
}
