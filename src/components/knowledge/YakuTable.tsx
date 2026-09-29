'use client';

import { useState } from 'react';
import { YAKU_LIST, DORA_INFO } from '@/lib/mahjong/yaku';

type FilterType = 'all' | '1' | '2' | '3' | '6' | 'yakuman';

export function YakuTable() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredYaku = filter === 'all'
    ? YAKU_LIST
    : filter === 'yakuman'
      ? YAKU_LIST.filter(y => y.isYakuman)
      : YAKU_LIST.filter(y => y.han === parseInt(filter) && !y.isYakuman);

  const groupedYaku = filter === 'all' ? groupByHan(filteredYaku) : null;

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all' as FilterType, label: '全部' },
          { id: '1' as FilterType, label: '1番' },
          { id: '2' as FilterType, label: '2番' },
          { id: '3' as FilterType, label: '3番' },
          { id: '6' as FilterType, label: '6番' },
          { id: 'yakuman' as FilterType, label: '役满' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              filter === f.id
                ? 'bg-[#C4463A] text-[#F6F1E4]'
                : 'bg-[#17251D] text-[#9FAF9E] hover:text-[#EFE9DA]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Dora Info */}
      <section className="bg-[#17251D] rounded-lg border border-[#C9A24B]/30 p-4">
        <h3 className="text-sm font-serif font-bold text-[#C9A24B] mb-2">宝牌说明</h3>
        <p className="text-xs text-[#EFE9DA] mb-2">{DORA_INFO.description}</p>
        <div className="space-y-2">
          {DORA_INFO.types.map(t => (
            <div key={t.name} className="bg-[#0F1A15] rounded p-2">
              <span className="text-xs font-medium text-[#C9A24B]">{t.name}</span>
              <span className="text-xs text-[#9FAF9E] ml-2">({t.nameJp})</span>
              <p className="text-xs text-[#9FAF9E] mt-1">{t.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Yaku List */}
      {filter === 'all' && groupedYaku ? (
        Object.entries(groupedYaku).map(([han, yakuList]) => (
          <div key={han}>
            <h3 className="text-sm font-serif font-bold text-[#C9A24B] mb-2">
              {han === 'yakuman' ? '役满' : `${han}番`}
            </h3>
            <div className="space-y-2">
              {yakuList.map(y => (
                <YakuCard
                  key={y.id}
                  yaku={y}
                  expanded={expandedId === y.id}
                  onToggle={() => setExpandedId(expandedId === y.id ? null : y.id)}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="space-y-2">
          {filteredYaku.map(y => (
            <YakuCard
              key={y.id}
              yaku={y}
              expanded={expandedId === y.id}
              onToggle={() => setExpandedId(expandedId === y.id ? null : y.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function YakuCard({ yaku, expanded, onToggle }: {
  yaku: typeof YAKU_LIST[0];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`bg-[#17251D] rounded-lg border p-3 transition-all cursor-pointer ${
        yaku.isYakuman ? 'border-[#C9A24B]/50' : 'border-[#26382C]'
      } ${expanded ? 'ring-1 ring-[#C9A24B]/30' : ''}`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${yaku.isYakuman ? 'text-[#C9A24B]' : 'text-[#EFE9DA]'}`}>
            {yaku.name}
          </span>
          <span className="text-xs text-[#9FAF9E]">{yaku.nameJp}</span>
        </div>
        <div className="flex items-center gap-2">
          {yaku.hanOpen === 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[#C4463A]/20 text-[#C4463A] rounded">门清</span>
          )}
          <span className={`text-xs font-bold ${yaku.isYakuman ? 'text-[#C9A24B]' : 'text-[#EFE9DA]'}`}>
            {yaku.isYakuman ? (yaku.han >= 26 ? '双倍役满' : '役满') : `${yaku.han}番`}
          </span>
        </div>
      </div>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-[#26382C]">
          <p className="text-xs text-[#9FAF9E] leading-relaxed">{yaku.description}</p>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-[#9FAF9E]">
              门清: <span className="text-[#EFE9DA]">{yaku.han}番</span>
            </span>
            {yaku.hanOpen > 0 && (
              <span className="text-[#9FAF9E]">
                副露: <span className="text-[#EFE9DA]">{yaku.hanOpen}番</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function groupByHan(yakuList: typeof YAKU_LIST): Record<string, typeof YAKU_LIST> {
  const groups: Record<string, typeof YAKU_LIST> = {};
  for (const y of yakuList) {
    const key = y.isYakuman ? 'yakuman' : String(y.han);
    if (!groups[key]) groups[key] = [];
    groups[key].push(y);
  }
  return groups;
}
