'use client';

import type { Tile } from '@/lib/mahjong/types';
import { getTileLabel, getTileColor } from '@/lib/mahjong/tile-utils';

interface TileDisplayProps {
  tile: Tile;
  small?: boolean;
  medium?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function TileDisplay({ tile, small, medium, selected, onClick }: TileDisplayProps) {
  const label = getTileLabel(tile);
  const color = getTileColor(tile);
  const sizeClass = small ? 'tile-small' : medium ? 'tile-medium' : '';
  const selectedClass = selected ? 'tile-selected' : '';
  const redClass = tile.isRed ? 'tile-red' : '';

  return (
    <div
      onClick={onClick}
      className={`tile ${sizeClass} ${selectedClass} ${redClass} ${onClick ? 'cursor-pointer' : ''}`}
      style={{ color }}
    >
      {label}
    </div>
  );
}
