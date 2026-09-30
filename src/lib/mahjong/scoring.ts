/**
 * 一局内的点数授受。
 *
 * 四麻与三麻的差异主要在自摸：三麻没有北家，少一家的支付，各家规则处理方式不同
 * （ツモ損 / 折半 / 千点加符 等，无统一标准），因此这里做成可选项。
 */

export type PlayerCount = 3 | 4;

export type ThreePlayerTsumoRule = 'tsumo-loss' | 'split-half' | 'thousand-bonus';

export interface ThreePlayerTsumoRuleInfo {
  id: ThreePlayerTsumoRule;
  name: string;
  description: string;
}

export const THREE_PLAYER_TSUMO_RULES: ThreePlayerTsumoRuleInfo[] = [
  {
    id: 'split-half',
    name: '折半（无自摸损失）',
    description:
      '和牌者拿到的自摸总点数与四麻相同，由在场两家平摊。最常见、也最容易理解。',
  },
  {
    id: 'tsumo-loss',
    name: 'ツモ損（不调整）',
    description:
      '按四麻比例计算，只向在场两家收取，北家那份直接损失。规则最简单，但自摸比荣和吃亏。',
  },
  {
    id: 'thousand-bonus',
    name: '千点加符',
    description: '在「ツモ損」基础上，两家各多付 1000 点作为补偿。',
  },
];

export function findTsumoRule(id: string): ThreePlayerTsumoRuleInfo {
  return THREE_PLAYER_TSUMO_RULES.find(r => r.id === id) ?? THREE_PLAYER_TSUMO_RULES[0];
}

/** 点数一律向上取整到 100 */
export function ceil100(value: number): number {
  return Math.ceil(value / 100) * 100;
}

export interface ScoreChangeInput {
  /** 基本点（由 calculatePoints 给出） */
  basicPoints: number;
  isDealer: boolean;
  isTsumo: boolean;
  playerCount: PlayerCount;
  /** 三麻自摸的分配规则，四麻忽略 */
  threePlayerTsumoRule?: ThreePlayerTsumoRule;
  honba: number;
  kyoutaku: number;
  winnerIndex: number;
  /** 本局庄家座位，用于区分自摸时各家的支付额 */
  dealerIndex: number;
  /** 荣和时的放铳者 */
  loserIndex?: number | null;
}

export interface ScoreChangeResult {
  /** 各家点数增减，长度等于人数 */
  deltas: number[];
  /** 和牌者本局总收入（含本场与供托） */
  winnerGain: number;
  /** 各家支付额，用于界面展示 */
  payments: { index: number; amount: number }[];
}

export function computeScoreChanges(input: ScoreChangeInput): ScoreChangeResult {
  const {
    basicPoints,
    isDealer,
    isTsumo,
    playerCount,
    threePlayerTsumoRule = 'split-half',
    honba,
    kyoutaku,
    winnerIndex,
    dealerIndex,
    loserIndex,
  } = input;

  const deltas = new Array<number>(playerCount).fill(0);
  const others = Array.from({ length: playerCount }, (_, i) => i).filter(
    i => i !== winnerIndex,
  );
  const payments: { index: number; amount: number }[] = [];
  const honbaBonus = 100 * honba;

  if (isTsumo) {
    const shares = tsumoShares({
      basicPoints,
      isDealer,
      playerCount,
      rule: threePlayerTsumoRule,
      others,
      dealerIndex,
    });

    others.forEach((index, k) => {
      const amount = shares[k] + honbaBonus;
      payments.push({ index, amount });
      deltas[index] -= amount;
      deltas[winnerIndex] += amount;
    });
  } else {
    const payer = loserIndex ?? others[0] ?? 0;
    const amount = ceil100(basicPoints * (isDealer ? 6 : 4)) + 300 * honba;
    payments.push({ index: payer, amount });
    deltas[payer] -= amount;
    deltas[winnerIndex] += amount;
  }

  // 供托（立直棒）由和牌者收走。这些点数在之前立直时已经付出，
  // 所以本局收支总额会多出 kyoutaku*1000，这是预期行为。
  deltas[winnerIndex] += kyoutaku * 1000;

  return { deltas, winnerGain: deltas[winnerIndex], payments };
}

function tsumoShares(params: {
  basicPoints: number;
  isDealer: boolean;
  playerCount: PlayerCount;
  rule: ThreePlayerTsumoRule;
  others: number[];
  dealerIndex: number;
}): number[] {
  const { basicPoints, isDealer, playerCount, rule, others, dealerIndex } = params;

  // 庄家自摸时每家都按 2 倍付；闲家自摸时只有庄家付 2 倍
  const rateFor = (index: number) => (isDealer || index === dealerIndex ? 2 : 1);

  if (playerCount === 4) {
    return others.map(i => ceil100(basicPoints * rateFor(i)));
  }

  if (rule === 'split-half') {
    // 和牌者收到与四麻相同的总额，两家平摊
    const total = ceil100(basicPoints * (isDealer ? 6 : 4));
    const half = ceil100(total / 2);
    return others.map(() => half);
  }

  const base = others.map(i => ceil100(basicPoints * rateFor(i)));
  if (rule === 'thousand-bonus') return base.map(v => v + 1000);
  return base; // tsumo-loss
}

/** 供 UI 展示用的自摸支付描述，如「2000 / 4000（闲家 / 庄家）」 */
export function describeTsumoPayments(result: ScoreChangeResult, winnerIndex: number): string {
  const shares = result.payments.filter(p => p.index !== winnerIndex);
  const amounts = Array.from(new Set(shares.map(p => p.amount)));
  if (amounts.length === 1) return `${amounts[0]} 点 × ${shares.length} 家`;
  return amounts.join(' / ');
}
