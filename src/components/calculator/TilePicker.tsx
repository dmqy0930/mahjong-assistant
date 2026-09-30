'use client';

import { X } from 'lucide-react';
import type { Tile } from '@/lib/mahjong/types';
import { getAllTileTypes, createTile } from '@/lib/mahjong/tile-utils';
import { TileDisplay } from './TileDisplay';

interface TilePickerProps {
  onSelect: (tile: Tile) => void;
  onClose: () => void;
}

export function TilePicker({ onSelect, onClose }: TilePickerProps) {
  const allTiles = getAllTileTypes();

  // Group by suit
  const manTiles = allTiles.filter(t => t.suit === 'man');
  const pinTiles = allTiles.filter(t => t.suit === 'pin');
  const souTiles = allTiles.filter(t => t.suit === 'sou');
  const honorTiles = allTiles.filter(t => t.suit === 'honor');

  return (
    <div className="fixed inset-0 z-[100] bg-[#0F1A15]/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#26382C]">
        <h3 className="text-sm font-serif font-bold text-[#EFE9DA]">选择牌</h3>
        <button onClick={onClose} className="p-2 text-[#9FAF9E] hover:text-[#EFE9DA]">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tiles */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <TileGroup title="万子" tiles={manTiles} onSelect={onSelect} color="#C4463A" />
        <TileGroup title="筒子" tiles={pinTiles} onSelect={onSelect} color="#2C6CA8" />
        <TileGroup title="条子" tiles={souTiles} onSelect={onSelect} color="#2F8B4C" />
        <TileGroup title="字牌" tiles={honorTiles} onSelect={onSelect} color="#EFE9DA" />
      </div>
    </div>
  );
}

function TileGroup({ title, tiles, onSelect, color }: {
  title: string;
  tiles: { suit: string; rank: number; label: string }[];
  onSelect: (tile: Tile) => void;
  color: string;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium mb-2" style={{ color }}>{title}</h4>
      <div className="flex flex-wrap gap-2">
        {tiles.map(t => {
          const tile = createTile(t.suit as Tile['suit'], t.rank);
          return (
            <button
              key={t.label}
              onClick={() => onSelect(tile)}
              className="active:scale-95 transition-transform"
            >
              <TileDisplay tile={tile} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
