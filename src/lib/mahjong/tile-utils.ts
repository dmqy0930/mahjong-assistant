import type { Tile } from './types';

// 麻将牌Unicode/文字映射
const SUIT_LABELS: Record<string, string> = {
  man: '万',
  pin: '筒',
  sou: '索',
};

const HONOR_LABELS: Record<number, string> = {
  1: '東',
  2: '南',
  3: '西',
  4: '北',
  5: '白',
  6: '發',
  7: '中',
};

const HONOR_COLORS: Record<number, string> = {
  1: '#1E1E1E',
  2: '#1E1E1E',
  3: '#1E1E1E',
  4: '#1E1E1E',
  5: '#2C6CA8',
  6: '#2F8B4C',
  7: '#B2372C',
};

// 获取牌的显示文字
export function getTileLabel(tile: Tile): string {
  if (tile.suit === 'honor') {
    return HONOR_LABELS[tile.rank] || '?';
  }
  return `${tile.rank}${SUIT_LABELS[tile.suit] || ''}`;
}

// 获取牌的颜色
export function getTileColor(tile: Tile): string {
  if (tile.suit === 'honor') {
    return HONOR_COLORS[tile.rank] || '#1E1E1E';
  }
  if (tile.suit === 'man') return '#B2372C';
  if (tile.suit === 'pin') return '#2C6CA8';
  if (tile.suit === 'sou') return '#2F8B4C';
  return '#1E1E1E';
}

// 获取牌的CSS类名
export function getTileClassName(tile: Tile): string {
  if (tile.suit === 'honor') {
    if (tile.rank === 5) return 'tile-haku'; // 白
    if (tile.rank === 6) return 'tile-hatsu'; // 发
    if (tile.rank === 7) return 'tile-chun'; // 中
    return 'tile-wind';
  }
  return `tile-${tile.suit}`;
}

// 判断两张牌是否相同
export function isSameTile(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

// 排序牌
export function sortTiles(tiles: Tile[]): Tile[] {
  const suitOrder: Record<string, number> = { man: 0, pin: 1, sou: 2, honor: 3 };
  return [...tiles].sort((a, b) => {
    const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return a.rank - b.rank;
  });
}

// 生成唯一ID
export function generateTileId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// 创建一张牌
export function createTile(suit: Tile['suit'], rank: number, isRed = false): Tile {
  return { suit, rank, isRed, id: generateTileId() };
}

// 获取所有牌的列表（用于选择器）
export function getAllTileTypes(): { suit: Tile['suit']; rank: number; label: string }[] {
  const tiles: { suit: Tile['suit']; rank: number; label: string }[] = [];
  for (const suit of ['man', 'pin', 'sou'] as const) {
    for (let rank = 1; rank <= 9; rank++) {
      tiles.push({ suit, rank, label: `${rank}${SUIT_LABELS[suit]}` });
    }
  }
  for (let rank = 1; rank <= 7; rank++) {
    tiles.push({ suit: 'honor', rank, label: HONOR_LABELS[rank] });
  }
  return tiles;
}
