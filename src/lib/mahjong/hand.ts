import type {
  BaWind,
  Janto,
  Mentsu,
  PlayerWind,
  TenpaiType,
  Tile,
  WinType,
} from './types';
import { isGreen } from './calculator';
import { YAKU_LIST } from './yaku';

/**
 * 牌索引：0-8 万1-9，9-17 筒1-9，18-26 索1-9，27-33 字牌（东南西北白发中）
 */
export const TILE_KIND_COUNT = 34;

const WIND_RANK: Record<string, number> = { east: 1, south: 2, west: 3, north: 4 };
const WIND_INDEX_START = 27;
const DRAGON_INDEX_START = 31;
const SUIT_BASE = [0, 9, 18] as const;

export function tileIndex(tile: Tile): number {
  if (tile.suit === 'honor') return WIND_INDEX_START + tile.rank - 1;
  const base = tile.suit === 'man' ? 0 : tile.suit === 'pin' ? 9 : 18;
  return base + tile.rank - 1;
}

export function indexToTile(index: number): Tile {
  if (index >= 27) return { suit: 'honor', rank: index - 26 };
  if (index >= 18) return { suit: 'sou', rank: index - 17 };
  if (index >= 9) return { suit: 'pin', rank: index - 8 };
  return { suit: 'man', rank: index + 1 };
}

export function tilesToCounts(tiles: Tile[]): number[] {
  const counts = new Array<number>(TILE_KIND_COUNT).fill(0);
  for (const tile of tiles) counts[tileIndex(tile)]++;
  return counts;
}

function isYaochuuIndex(index: number): boolean {
  if (index >= 27) return true;
  const rank = index % 9;
  return rank === 0 || rank === 8;
}

function isYakuhaiIndex(index: number, playerWind: PlayerWind, baWind: BaWind): boolean {
  if (index >= DRAGON_INDEX_START) return true;
  if (index < WIND_INDEX_START) return false;
  const rank = index - WIND_INDEX_START + 1;
  return rank === WIND_RANK[playerWind] || rank === WIND_RANK[baWind];
}

/** 面子（以索引表示）：start 为顺子的最小牌，或刻子/杠子的牌 */
interface IndexSet {
  kind: 'shuntsu' | 'koutsu';
  start: number;
}

export interface Decomposition {
  janto: number;
  sets: IndexSet[];
  /** 由荣和的和了牌补成的刻子（按明刻计） */
  ronSetIndex: number | null;
}

/** 拆解雀头 + 面子（不含七对子/国士），返回所有可能的拆法 */
export function decomposeStandard(counts: number[]): Decomposition[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total % 3 !== 2) return [];

  const results: Decomposition[] = [];
  for (let janto = 0; janto < TILE_KIND_COUNT; janto++) {
    if (counts[janto] < 2) continue;
    counts[janto] -= 2;
    for (const sets of decomposeSets(counts, 0, [])) {
      results.push({ janto, sets, ronSetIndex: null });
    }
    counts[janto] += 2;
  }
  return results;
}

function decomposeSets(counts: number[], from: number, acc: IndexSet[]): IndexSet[][] {
  let i = from;
  while (i < TILE_KIND_COUNT && counts[i] === 0) i++;
  if (i === TILE_KIND_COUNT) return [acc];

  const results: IndexSet[][] = [];

  if (counts[i] >= 3) {
    counts[i] -= 3;
    results.push(...decomposeSets(counts, i, [...acc, { kind: 'koutsu', start: i }]));
    counts[i] += 3;
  }

  if (i < 27 && i % 9 <= 6 && counts[i + 1] > 0 && counts[i + 2] > 0) {
    counts[i]--;
    counts[i + 1]--;
    counts[i + 2]--;
    results.push(...decomposeSets(counts, i, [...acc, { kind: 'shuntsu', start: i }]));
    counts[i]++;
    counts[i + 1]++;
    counts[i + 2]++;
  }

  return results;
}

/** 七对子 */
export function isChiitoitsu(counts: number[]): boolean {
  let pairs = 0;
  for (const c of counts) {
    if (c === 0) continue;
    if (c !== 2) return false;
    pairs++;
  }
  return pairs === 7;
}

const KOKUSHI_INDICES = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

/** 国士无双 */
export function isKokushi(counts: number[]): boolean {
  let pairs = 0;
  let total = 0;
  for (const idx of KOKUSHI_INDICES) {
    if (counts[idx] === 0) return false;
    if (counts[idx] === 2) pairs++;
    total += counts[idx];
  }
  return pairs === 1 && total === 14;
}

/** 国士无双十三面（十三种幺九牌各一张，听任意一张） */
function isKokushiJuusanmen(counts: number[], winIndex: number): boolean {
  if (counts[winIndex] !== 2) return false;
  return KOKUSHI_INDICES.every(idx => (idx === winIndex ? true : counts[idx] === 1));
}

/** 从某个拆法中判断听牌形 */
function detectWait(
  decomp: Decomposition,
  winIndex: number,
  playerWind: PlayerWind,
  baWind: BaWind,
): TenpaiType {
  if (decomp.janto === winIndex) return 'tanki';

  const shapes: TenpaiType[] = [];
  for (const set of decomp.sets) {
    if (set.kind === 'koutsu') {
      if (set.start === winIndex) shapes.push('shanpon');
      continue;
    }
    if (winIndex < set.start || winIndex > set.start + 2) continue;
    const offset = winIndex - set.start;
    const localStart = set.start % 9;
    if (offset === 1) shapes.push('kanchan');
    else if (offset === 2 && localStart === 0) shapes.push('penchan');
    else if (offset === 0 && localStart === 6) shapes.push('penchan');
    else shapes.push('ryanmen');
  }

  const allShuntsu = decomp.sets.every(s => s.kind === 'shuntsu');
  const jantoIsYakuhai = isYakuhaiIndex(decomp.janto, playerWind, baWind);
  if (allShuntsu && !jantoIsYakuhai && shapes.includes('ryanmen')) return 'ryanmen';

  for (const candidate of ['kanchan', 'penchan', 'tanki', 'ryanmen'] as TenpaiType[]) {
    if (shapes.includes(candidate)) return candidate;
  }
  return 'shanpon';
}

function indexSetToMentsu(set: IndexSet, isOpen: boolean): Mentsu {
  const tiles: Tile[] =
    set.kind === 'shuntsu'
      ? [indexToTile(set.start), indexToTile(set.start + 1), indexToTile(set.start + 2)]
      : [indexToTile(set.start), indexToTile(set.start), indexToTile(set.start)];
  return { type: set.kind, tiles, isOpen };
}

interface EvalContext {
  counts: number[]; // 手牌（含和了牌）
  fullCounts: number[]; // 手牌 + 副露
  sets: IndexSet[]; // 手牌面子 + 副露面子
  concealedSets: IndexSet[];
  janto: number | null;
  ronSetIndex: number | null;
  winIndex: number;
  wait: TenpaiType;
  kanCount: number;
  isMenzen: boolean;
  isTsumo: boolean;
  playerWind: PlayerWind;
  baWind: BaWind;
  isChiitoitsu: boolean;
}

function hasKoutsu(ctx: EvalContext, index: number): boolean {
  return ctx.sets.some(s => s.kind === 'koutsu' && s.start === index);
}

function ankouIndices(ctx: EvalContext): number[] {
  return ctx.concealedSets
    .filter(s => s.kind === 'koutsu' && s.start !== ctx.ronSetIndex)
    .map(s => s.start);
}

function detectYakuman(ctx: EvalContext): string[] {
  const ids: string[] = [];
  const presentIndices = ctx.fullCounts
    .map((c, i) => (c > 0 ? i : -1))
    .filter(i => i >= 0);

  // 字一色 / 清老头
  if (presentIndices.every(i => i >= 27)) ids.push('tsuiisou');
  if (presentIndices.every(i => i < 27 && isYaochuuIndex(i))) ids.push('chinroutou');

  // 绿一色（仅索子 2/3/4/6/8 与发）
  const allTilesGreen = presentIndices.every(i => isGreen(indexToTile(i)));
  if (allTilesGreen) ids.push('ryuiisou');

  // 大三元 / 小三元 / 大四喜 / 小四喜
  if (hasKoutsu(ctx, 31) && hasKoutsu(ctx, 32) && hasKoutsu(ctx, 33)) ids.push('daisangen');
  const windKoutsu = [27, 28, 29, 30].filter(i => hasKoutsu(ctx, i));
  if (windKoutsu.length === 4) ids.push('daisuushii');
  else if (windKoutsu.length === 3 && ctx.janto !== null && [27, 28, 29, 30].includes(ctx.janto)) {
    ids.push('shousuushii');
  }

  // 四暗刻（含单骑）
  if (ctx.isMenzen && ankouIndices(ctx).length === 4) {
    ids.push(ctx.wait === 'tanki' ? 'suuankou_tanki' : 'suuankou');
  }

  // 四杠子
  if (ctx.kanCount === 4) ids.push('suukantsu');

  // 九莲宝灯
  const chuuren = detectChuuren(ctx);
  if (chuuren) ids.push(chuuren);

  return ids;
}

function detectChuuren(ctx: EvalContext): 'chuuren' | 'chuuren_pure' | null {
  if (!ctx.isMenzen) return null;
  const base = [3, 1, 1, 1, 1, 1, 1, 1, 3];
  for (const suitBase of SUIT_BASE) {
    const inSuit = ctx.counts.slice(suitBase, suitBase + 9);
    const outside = ctx.counts.filter((c, i) => c > 0 && (i < suitBase || i >= suitBase + 9));
    if (outside.length > 0) continue;
    if (inSuit.reduce((a, b) => a + b, 0) !== 14) continue;

    let extraRank = -1;
    let valid = true;
    for (let r = 0; r < 9; r++) {
      const diff = inSuit[r] - base[r];
      if (diff === 0) continue;
      if (diff === 1 && extraRank === -1) extraRank = r;
      else valid = false;
    }
    if (!valid || extraRank === -1) continue;

    const pure = suitBase + extraRank === ctx.winIndex;
    return pure ? 'chuuren_pure' : 'chuuren';
  }
  return null;
}

function detectNormalYaku(ctx: EvalContext): string[] {
  const ids: string[] = [];

  if (ctx.isChiitoitsu) {
    ids.push('chitoitsu');
  } else {
    const allShuntsu = ctx.sets.every(s => s.kind === 'shuntsu');
    const jantoIsYakuhai =
      ctx.janto !== null && isYakuhaiIndex(ctx.janto, ctx.playerWind, ctx.baWind);

    // 平和
    if (ctx.isMenzen && allShuntsu && !jantoIsYakuhai && ctx.wait === 'ryanmen') {
      ids.push('pinfu');
    }

    // 一杯口 / 二杯口
    if (ctx.isMenzen) {
      const shuntsuStarts = ctx.sets.filter(s => s.kind === 'shuntsu').map(s => s.start);
      const pairCount = countPairs(shuntsuStarts);
      if (pairCount >= 2) ids.push('ryanpeikou');
      else if (pairCount === 1) ids.push('iipeikou');
    }

    // 三色同顺 / 三色同刻
    if (hasSanshokuDoujun(ctx.sets)) ids.push('sanshoku_doujun');
    if (hasSanshokuDoukou(ctx.sets)) ids.push('sanshoku_doukou');

    // 一气通贯
    if (hasIkkitsuukan(ctx.sets)) ids.push('ikkitsuukan');

    // 对对和
    if (ctx.sets.every(s => s.kind === 'koutsu')) ids.push('toitoi');

    // 三暗刻
    if (ankouIndices(ctx).length >= 3) ids.push('sanankou');

    // 役牌
    for (const set of ctx.sets) {
      if (set.kind !== 'koutsu' || set.start < WIND_INDEX_START) continue;
      if (set.start === 31) ids.push('yakuhaku_haku');
      else if (set.start === 32) ids.push('yakuhaku_hatsu');
      else if (set.start === 33) ids.push('yakuhaku_chun');
      else {
        const rank = set.start - WIND_INDEX_START + 1;
        if (rank === WIND_RANK[ctx.playerWind]) ids.push('yakuhaku_jikaze');
        if (rank === WIND_RANK[ctx.baWind]) ids.push('yakuhaku_bakaze');
      }
    }

    // 小三元（两个三元刻子 + 三元雀头）
    const dragonKoutsu = [31, 32, 33].filter(i => hasKoutsu(ctx, i)).length;
    if (dragonKoutsu === 2 && ctx.janto !== null && ctx.janto >= 31) ids.push('shousangen');

    // 混全帯幺九 / 纯全帯幺九 / 混老頭
    if (ctx.janto !== null) {
      const allGroupsHaveYaochuu =
        isYaochuuIndex(ctx.janto) &&
        ctx.sets.every(s =>
          s.kind === 'koutsu'
            ? isYaochuuIndex(s.start)
            : isYaochuuIndex(s.start) || isYaochuuIndex(s.start + 2),
        );
      if (allGroupsHaveYaochuu) {
        const hasHonor = ctx.fullCounts.some((c, i) => c > 0 && i >= 27);
        const hasShuntsu = ctx.sets.some(s => s.kind === 'shuntsu');
        ids.push(hasShuntsu ? (hasHonor ? 'chantaiyao' : 'honchantaiyao') : 'honroutou');
      }
    }
  }

  // 断幺九
  if (!ctx.fullCounts.some((c, i) => c > 0 && isYaochuuIndex(i))) ids.push('tanyao');

  // 混一色 / 清一色
  const usedSuits = new Set<number>();
  let hasHonor = false;
  ctx.fullCounts.forEach((c, i) => {
    if (c === 0) return;
    if (i >= 27) hasHonor = true;
    else usedSuits.add(i <= 8 ? 0 : i <= 17 ? 1 : 2);
  });
  if (usedSuits.size === 1) ids.push(hasHonor ? 'honitsu' : 'chinitsu');

  // 门清自摸
  if (ctx.isMenzen && ctx.isTsumo) ids.push('menzen_tsumo');

  return ids;
}

function countPairs(values: number[]): number {
  const seen = new Map<number, number>();
  for (const v of values) seen.set(v, (seen.get(v) ?? 0) + 1);
  let pairs = 0;
  for (const count of seen.values()) pairs += Math.floor(count / 2);
  return pairs;
}

function hasSanshokuDoujun(sets: IndexSet[]): boolean {
  for (let rank = 0; rank < 7; rank++) {
    const found = SUIT_BASE.every(base =>
      sets.some(s => s.kind === 'shuntsu' && s.start === base + rank),
    );
    if (found) return true;
  }
  return false;
}

function hasSanshokuDoukou(sets: IndexSet[]): boolean {
  for (let rank = 0; rank < 9; rank++) {
    const found = SUIT_BASE.every(base =>
      sets.some(s => s.kind === 'koutsu' && s.start === base + rank),
    );
    if (found) return true;
  }
  return false;
}

function hasIkkitsuukan(sets: IndexSet[]): boolean {
  return SUIT_BASE.some(base =>
    [0, 3, 6].every(offset => sets.some(s => s.kind === 'shuntsu' && s.start === base + offset)),
  );
}

export interface AnalyzeInput {
  handTiles: Tile[]; // 手牌（含和了牌）
  openMentsu: Mentsu[]; // 副露面子
  winTile: Tile;
  agariType: 'tsumo' | 'ron';
  isMenzen: boolean;
  playerWind: PlayerWind;
  baWind: BaWind;
}

export interface HandAnalysis {
  isAgari: boolean;
  winType: WinType | null;
  mentsu: Mentsu[];
  janto: Janto | null;
  tenpaiType: TenpaiType;
  yakuIds: string[];
  message: string | null;
}

const EMPTY_ANALYSIS: HandAnalysis = {
  isAgari: false,
  winType: null,
  mentsu: [],
  janto: null,
  tenpaiType: 'ryanmen',
  yakuIds: [],
  message: null,
};

/**
 * 分析手牌：判定和牌形、拆解面子/雀头、推断听牌形，并自动识别役种。
 */
export function analyzeHand(input: AnalyzeInput): HandAnalysis {
  const { handTiles, openMentsu, winTile, agariType, isMenzen, playerWind, baWind } = input;
  const openCount = openMentsu.length;
  const expectedConcealed = 14 - openCount * 3;

  if (handTiles.length !== expectedConcealed) {
    return {
      ...EMPTY_ANALYSIS,
      message: `当前手牌 ${handTiles.length} 张，和牌应为 ${expectedConcealed} 张`,
    };
  }
  if (!isMenzen && openCount === 0) {
    return { ...EMPTY_ANALYSIS, message: '已标记副露，但没有录入副露面子' };
  }

  const counts = tilesToCounts(handTiles);
  const winIndex = tileIndex(winTile);

  // 全部牌（手牌 + 副露）的索引计数
  const fullCounts = [...counts];
  let kanCount = 0;
  const openSets: IndexSet[] = [];
  for (const m of openMentsu) {
    if (m.type === 'kantsu') kanCount++;
    openSets.push({
      kind: m.type === 'shuntsu' ? 'shuntsu' : 'koutsu',
      start: tileIndex(m.tiles[0]),
    });
    for (const t of m.tiles) fullCounts[tileIndex(t)]++;
  }

  const baseCtx = {
    counts,
    fullCounts,
    winIndex,
    kanCount,
    isMenzen,
    isTsumo: agariType === 'tsumo',
    playerWind,
    baWind,
  };

  // 国士无双（门清限定）
  if (openCount === 0 && isKokushi(counts)) {
    const juusanmen = isKokushiJuusanmen(counts, winIndex);
    return {
      isAgari: true,
      winType: 'kokushi',
      mentsu: [],
      janto: null,
      tenpaiType: 'tanki',
      yakuIds: [juusanmen ? 'kokushi_juusanmen' : 'kokushi'],
      message: null,
    };
  }

  // 七对子（门清限定）
  if (openCount === 0 && isChiitoitsu(counts)) {
    const ctx: EvalContext = {
      ...baseCtx,
      sets: [],
      concealedSets: [],
      janto: null,
      ronSetIndex: null,
      wait: 'tanki',
      isChiitoitsu: true,
    };
    const yakuman = detectYakuman(ctx);
    return {
      isAgari: true,
      winType: 'chitoitsu',
      mentsu: [],
      janto: null,
      tenpaiType: 'tanki',
      yakuIds: dedupe([...yakuman, ...detectNormalYaku(ctx)]),
      message: null,
    };
  }

  const decompositions = decomposeStandard(counts);
  if (decompositions.length === 0) {
    return { ...EMPTY_ANALYSIS, message: '未识别到和牌形（无法组成 4 面子 + 1 雀头）' };
  }

  let best: { decomp: Decomposition; wait: TenpaiType; yakuIds: string[] } | null = null;

  for (const decomp of decompositions) {
    const wait = detectWait(decomp, winIndex, playerWind, baWind);
    const ronSetIndex =
      agariType === 'ron'
        ? (decomp.sets.find(s => s.kind === 'koutsu' && s.start === winIndex)?.start ?? null)
        : null;
    const evaluated: Decomposition = { ...decomp, ronSetIndex };

    const ctx: EvalContext = {
      ...baseCtx,
      sets: [...evaluated.sets, ...openSets],
      concealedSets: evaluated.sets,
      janto: evaluated.janto,
      ronSetIndex,
      wait,
      isChiitoitsu: false,
    };

    const yakuIds = dedupe([...detectYakuman(ctx), ...detectNormalYaku(ctx)]);
    if (!best || yakuScore(yakuIds) > yakuScore(best.yakuIds)) {
      best = { decomp: evaluated, wait, yakuIds };
    }
  }

  if (!best) return EMPTY_ANALYSIS;
  const chosen = best;

  const mentsu = chosen.decomp.sets.map(set =>
    indexSetToMentsu(set, agariType === 'ron' && set.start === chosen.decomp.ronSetIndex),
  );
  const jantoTile = indexToTile(chosen.decomp.janto);

  return {
    isAgari: true,
    winType: 'normal',
    mentsu,
    janto: { tiles: [jantoTile, jantoTile] },
    tenpaiType: chosen.wait,
    yakuIds: chosen.yakuIds,
    message: chosen.yakuIds.length === 0 ? '未检测到役（无役不能和牌）' : null,
  };
}

function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

/** 用役种表番数给一组役打分，用于挑选收益最高的拆法 */
function yakuScore(ids: string[]): number {
  return ids.reduce((sum, id) => {
    const yaku = YAKU_LIST.find(y => y.id === id);
    if (!yaku) return sum;
    return sum + (yaku.isYakuman ? 100 + yaku.han : yaku.han);
  }, 0);
}
