/**
 * 识别结果自检。
 *
 * 麻将有几条硬性物理约束（张数、每种牌最多 4 张、和了牌必在手牌里），
 * 拿这些约束去校验模型输出，能捞出一大批"看起来合理但实际不可能"的识别错误。
 */

const VALID_SUITS = new Set(['man', 'pin', 'sou', 'honor']);
const VALID_WIN_TYPES = new Set(['normal', 'chitoitsu', 'kokushi']);

interface TileLike {
  suit: string;
  rank: number;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function maxRank(suit: string): number {
  return suit === 'honor' ? 7 : 9;
}

function parseTile(value: unknown): TileLike | string {
  const record = asRecord(value);
  if (!record) return '存在无法解析的牌对象';

  const suit = record.suit;
  const rank = record.rank;
  if (typeof suit !== 'string' || !VALID_SUITS.has(suit)) {
    return `出现了非法花色「${String(suit)}」`;
  }
  if (typeof rank !== 'number' || !Number.isInteger(rank) || rank < 1 || rank > maxRank(suit)) {
    return `${suit} 出现了非法点数「${String(rank)}」`;
  }
  return { suit, rank };
}

function tileKey(tile: TileLike): string {
  return `${tile.suit}-${tile.rank}`;
}

/**
 * 返回问题列表；空数组表示通过。
 * 注意：这里只做「物理上是否可能」的检查，不判断是否真的和牌。
 */
export function checkRecognition(payload: unknown): string[] {
  const root = asRecord(payload);
  if (!root) return ['返回内容不是 JSON 对象'];

  const problems: string[] = [];
  const handRaw = root.handTiles;
  if (!Array.isArray(handRaw) || handRaw.length === 0) {
    return ['缺少 handTiles，或它不是非空数组'];
  }

  const handTiles: TileLike[] = [];
  for (const raw of handRaw) {
    const parsed = parseTile(raw);
    if (typeof parsed === 'string') problems.push(parsed);
    else handTiles.push(parsed);
  }

  const openRaw = asArray(root.openMentsu).filter(
    m => asRecord(m) !== undefined,
  );
  if (openRaw.length > 4) problems.push(`openMentsu 有 ${openRaw.length} 组，副露不可能超过 4 组`);

  const openTiles: TileLike[] = [];
  for (const mentsu of openRaw) {
    for (const raw of asArray(asRecord(mentsu)?.tiles)) {
      const parsed = parseTile(raw);
      if (typeof parsed === 'string') problems.push(`副露中${parsed}`);
      else openTiles.push(parsed);
    }
  }

  const expectedHand = 14 - openRaw.length * 3;
  if (handTiles.length !== expectedHand) {
    problems.push(
      `handTiles 有 ${handTiles.length} 张，副露 ${openRaw.length} 组时应该是 ${expectedHand} 张`,
    );
  }

  // 同一种牌合计不能超过 4 张
  const counts = new Map<string, number>();
  for (const tile of [...handTiles, ...openTiles]) {
    counts.set(tileKey(tile), (counts.get(tileKey(tile)) ?? 0) + 1);
  }
  for (const [key, count] of counts) {
    if (count > 4) {
      const [suit, rank] = key.split('-');
      problems.push(`${suit} ${rank} 出现了 ${count} 张，超过 4 张，识别有误`);
    }
  }

  const win = parseTile(root.winTile);
  if (typeof win === 'string') {
    problems.push(`winTile 无法解析：${win}`);
  } else if (!handTiles.some(t => tileKey(t) === tileKey(win))) {
    problems.push('winTile 没有出现在 handTiles 中，说明手牌或和了牌识别有误');
  }

  if (typeof root.winType === 'string' && !VALID_WIN_TYPES.has(root.winType)) {
    problems.push(`winType「${root.winType}」不是 normal / chitoitsu / kokushi 之一`);
  }

  return problems;
}
