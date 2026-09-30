'use client';

import { useState } from 'react';
import { ArrowLeft, BookOpen, Search, Scroll, Calculator, Wind, Users } from 'lucide-react';
import Link from 'next/link';
import { WinRules } from '@/components/knowledge/WinRules';
import { YakuTable } from '@/components/knowledge/YakuTable';
import { TermSearch } from '@/components/knowledge/TermSearch';
import { FuCalc } from '@/components/knowledge/FuCalc';
import { WindInfo } from '@/components/knowledge/WindInfo';
import { ThreePlayerRules } from '@/components/knowledge/ThreePlayerRules';

type Tab = 'rules' | 'yaku' | 'terms' | 'fu' | 'wind' | 'three';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'rules', label: '和牌规则', icon: <Scroll className="w-4 h-4" /> },
  { id: 'yaku', label: '役种表', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'terms', label: '术语', icon: <Search className="w-4 h-4" /> },
  { id: 'fu', label: '番符计算', icon: <Calculator className="w-4 h-4" /> },
  { id: 'wind', label: '风牌', icon: <Wind className="w-4 h-4" /> },
  { id: 'three', label: '三麻', icon: <Users className="w-4 h-4" /> },
];

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<Tab>('rules');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0F1A15]/95 backdrop-blur-sm border-b border-[#26382C]">
        <div className="flex items-center px-4 py-3">
          <Link href="/" className="p-2 -ml-2 mr-2 text-[#9FAF9E] hover:text-[#EFE9DA] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-serif font-bold text-[#EFE9DA]">基础知识</h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto px-2 pb-2 gap-1 no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#C4463A] text-[#F6F1E4]'
                  : 'bg-[#17251D] text-[#9FAF9E] hover:text-[#EFE9DA]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full animate-fade-in">
        {activeTab === 'rules' && <WinRules />}
        {activeTab === 'yaku' && <YakuTable />}
        {activeTab === 'terms' && <TermSearch />}
        {activeTab === 'fu' && <FuCalc />}
        {activeTab === 'wind' && <WindInfo />}
        {activeTab === 'three' && <ThreePlayerRules />}
      </main>
    </div>
  );
}
