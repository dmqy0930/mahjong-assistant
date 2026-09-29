'use client';

import { useState } from 'react';
import { TERMS, TERM_CATEGORIES } from '@/lib/mahjong/terms';

export function TermSearch() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = TERMS.filter(t => {
    const matchesQuery = !query || 
      t.term.includes(query) || 
      t.termJp.includes(query) ||
      t.description.includes(query);
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索术语..."
          className="w-full bg-[#17251D] border border-[#26382C] rounded-lg px-4 py-2.5 text-sm text-[#EFE9DA] placeholder-[#9FAF9E] focus:outline-none focus:border-[#C9A24B]/50 focus:ring-1 focus:ring-[#C9A24B]/30"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9FAF9E] hover:text-[#EFE9DA]"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeCategory === 'all'
              ? 'bg-[#C4463A] text-[#F6F1E4]'
              : 'bg-[#17251D] text-[#9FAF9E] hover:text-[#EFE9DA]'
          }`}
        >
          全部
        </button>
        {TERM_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeCategory === cat
                ? 'bg-[#C4463A] text-[#F6F1E4]'
                : 'bg-[#17251D] text-[#9FAF9E] hover:text-[#EFE9DA]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <p className="text-xs text-[#9FAF9E]">
        共 {filtered.length} 个术语
      </p>

      {/* Term List */}
      <div className="space-y-2">
        {filtered.map(term => (
          <div
            key={term.id}
            className="bg-[#17251D] rounded-lg border border-[#26382C] p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#EFE9DA]">{term.term}</span>
                <span className="text-xs text-[#9FAF9E]">{term.termJp}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#26382C] text-[#9FAF9E] rounded">
                {term.category}
              </span>
            </div>
            <p className="text-xs text-[#9FAF9E] leading-relaxed">{term.description}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-[#9FAF9E]">未找到相关术语</p>
        </div>
      )}
    </div>
  );
}
