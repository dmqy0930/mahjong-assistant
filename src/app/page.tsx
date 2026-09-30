'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Camera, Calculator, Settings, UserRound, Users } from 'lucide-react';
import { currentDisplayName, getCurrentAccount } from '@/lib/auth/local-account';

export default function HomePage() {
  const [account, setAccount] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    const current = getCurrentAccount();
    setAccount(current ? { email: current.email, name: currentDisplayName() } : null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="relative pt-12 pb-8 px-6 text-center pattern-seigaiha">
        <Link
          href="/login"
          className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#17251D] border border-[#26382C] text-[#9FAF9E] hover:text-[#EFE9DA] hover:border-[#C9A24B]/50 transition-colors max-w-[9rem]"
        >
          <UserRound className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[10px] truncate">{account ? account.name : '登录 / 注册'}</span>
        </Link>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#17251D] border border-[#26382C] mb-4">
          <span className="text-3xl font-serif font-bold text-[#C9A24B]">雀</span>
        </div>
        <h1 className="text-2xl font-serif font-bold text-[#EFE9DA] mb-2">
          麻雀助手
        </h1>
        <p className="text-sm text-[#9FAF9E]">
          日本麻将 · 算点 · 对局记录
        </p>
      </header>

      {/* Main Navigation */}
      <main className="flex-1 px-4 pb-8 max-w-lg mx-auto w-full">
        <div className="space-y-4 mt-6">
          <Link
            href="/knowledge"
            className="block group"
          >
            <div className="bg-[#17251D] rounded-lg border border-[#26382C] p-5 transition-all duration-200 group-hover:border-[#C9A24B]/50 group-hover:shadow-lg group-hover:shadow-[#C9A24B]/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#C9A24B]/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-[#C9A24B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-serif font-bold text-[#EFE9DA] mb-1">
                    基础知识
                  </h2>
                  <p className="text-sm text-[#9FAF9E] leading-relaxed">
                    和牌规则 · 役种表 · 术语查询 · 番符计算
                  </p>
                </div>
                <div className="text-[#9FAF9E] text-sm">→</div>
              </div>
            </div>
          </Link>

          <Link
            href="/calculator"
            className="block group"
          >
            <div className="bg-[#17251D] rounded-lg border border-[#26382C] p-5 transition-all duration-200 group-hover:border-[#C4463A]/50 group-hover:shadow-lg group-hover:shadow-[#C4463A]/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#C4463A]/10 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-6 h-6 text-[#C4463A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-serif font-bold text-[#EFE9DA] mb-1">
                    拍照算点
                  </h2>
                  <p className="text-sm text-[#9FAF9E] leading-relaxed">
                    拍照识别牌面 · 自动计算点数 · 手动编辑修正
                  </p>
                </div>
                <div className="text-[#9FAF9E] text-sm">→</div>
              </div>
            </div>
          </Link>

          <Link
            href="/game"
            className="block group"
          >
            <div className="bg-[#17251D] rounded-lg border border-[#26382C] p-5 transition-all duration-200 group-hover:border-[#5B8C5A]/50 group-hover:shadow-lg group-hover:shadow-[#5B8C5A]/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#5B8C5A]/10 flex items-center justify-center flex-shrink-0">
                  <Calculator className="w-6 h-6 text-[#5B8C5A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-serif font-bold text-[#EFE9DA] mb-1">
                    一局计分
                  </h2>
                  <p className="text-sm text-[#9FAF9E] leading-relaxed">
                    对局记录 · 点数管理 · 顺位排名 · 历史明细
                  </p>
                </div>
                <div className="text-[#9FAF9E] text-sm">→</div>
              </div>
            </div>
          </Link>

          <Link
            href="/room"
            className="block group"
          >
            <div className="bg-[#17251D] rounded-lg border border-[#26382C] p-5 transition-all duration-200 group-hover:border-[#C9A24B]/50 group-hover:shadow-lg group-hover:shadow-[#C9A24B]/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#C9A24B]/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-[#C9A24B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-serif font-bold text-[#EFE9DA] mb-1">
                    对局房间
                  </h2>
                  <p className="text-sm text-[#9FAF9E] leading-relaxed">
                    房间号共享 · 四人同步记录 · 拍照算分直接入账
                  </p>
                </div>
                <div className="text-[#9FAF9E] text-sm">→</div>
              </div>
            </div>
          </Link>

          <Link
            href="/settings"
            className="block group"
          >
            <div className="bg-[#17251D] rounded-lg border border-[#26382C] p-5 transition-all duration-200 group-hover:border-[#C9A24B]/50 group-hover:shadow-lg group-hover:shadow-[#C9A24B]/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#C9A24B]/10 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-6 h-6 text-[#C9A24B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-serif font-bold text-[#EFE9DA] mb-1">
                    API 配置
                  </h2>
                  <p className="text-sm text-[#9FAF9E] leading-relaxed">
                    多厂商模型接入 · 密钥本地保存 · 连通性测试
                  </p>
                </div>
                <div className="text-[#9FAF9E] text-sm">→</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Tips */}
        <div className="mt-8 p-4 bg-[#17251D]/50 rounded-lg border border-[#26382C]/50">
          <p className="text-xs text-[#9FAF9E] text-center leading-relaxed">
            手机拍照识别牌面，自动计算番符点数<br />
            支持手动编辑修正，对局中快速操作
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center border-t border-[#26382C]/50">
        <p className="text-xs text-[#9FAF9E]">
          麻雀助手 v1.0
        </p>
      </footer>
    </div>
  );
}
