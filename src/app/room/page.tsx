'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, DoorOpen, Loader2, Plus } from 'lucide-react';
import { createRoom } from '@/lib/room/api';
import { roomServiceConfigured } from '@/lib/room/client';
import {
  DEFAULT_ROOM_META,
  isValidRoomCode,
  normalizeRoomCode,
  type RoomMeta,
} from '@/lib/room/types';
import { THREE_PLAYER_TSUMO_RULES, type PlayerCount } from '@/lib/mahjong/scoring';

export default function RoomIndexPage() {
  const router = useRouter();
  const [configured, setConfigured] = useState(true);
  const [meta, setMeta] = useState<RoomMeta>(DEFAULT_ROOM_META);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConfigured(roomServiceConfigured());
  }, []);

  const visibleNames = useMemo(
    () => meta.playerNames.slice(0, meta.playerCount),
    [meta.playerNames, meta.playerCount],
  );

  const handleCreate = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await createRoom({ ...meta, playerNames: visibleNames });
      if (!result.ok || !result.data) {
        setError(result.error ?? '创建失败');
        return;
      }
      router.push(`/room/${result.data}`);
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = () => {
    const code = normalizeRoomCode(joinCode);
    if (!isValidRoomCode(code)) {
      setError('房间号是 6 位字母数字（不含 I、O、0、1）');
      return;
    }
    router.push(`/room/${code}`);
  };

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <header className="sticky top-0 z-50 bg-[#0F1A15]/95 backdrop-blur-sm border-b border-[#26382C]">
        <div className="flex items-center px-4 py-3">
          <Link href="/" className="p-2 -ml-2 mr-2 text-[#9FAF9E] hover:text-[#EFE9DA] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-serif font-bold text-[#EFE9DA]">对局房间</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {!configured && (
          <section className="bg-[#C4463A]/10 border border-[#C4463A]/30 rounded-lg p-4">
            <h2 className="text-sm font-medium text-[#C4463A] mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              房间服务尚未配置
            </h2>
            <p className="text-xs text-[#9FAF9E] leading-relaxed">
              房间需要服务端存储才能多人共享。请先完成两步：
              <br />
              1. 在 Supabase 建项目，把 <code className="text-[#C9A24B]">supabase/schema.sql</code> 整段贴进 SQL Editor 执行；
              <br />
              2. 在部署平台配置环境变量 <code className="text-[#C9A24B]">NEXT_PUBLIC_SUPABASE_URL</code> 与{' '}
              <code className="text-[#C9A24B]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>，然后重新部署。
            </p>
          </section>
        )}

        {/* 加入房间 */}
        <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
          <h2 className="text-sm font-serif font-bold text-[#C9A24B] mb-3 flex items-center gap-1.5">
            <DoorOpen className="w-4 h-4" />
            加入房间
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="6 位房间号"
              maxLength={8}
              spellCheck={false}
              className="flex-1 bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2 text-sm tracking-widest text-[#EFE9DA] placeholder-[#55695B] focus:outline-none focus:border-[#C9A24B]/60"
            />
            <button
              onClick={handleJoin}
              disabled={!joinCode}
              className="px-4 py-2 bg-[#C4463A] text-[#F6F1E4] rounded-md text-xs font-medium btn-vermillion disabled:opacity-40"
            >
              进入
            </button>
          </div>
        </section>

        {/* 创建房间 */}
        <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
          <h2 className="text-sm font-serif font-bold text-[#C9A24B] mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            创建房间
          </h2>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#9FAF9E] mb-1">人数</p>
              <div className="flex gap-2">
                {([4, 3] as PlayerCount[]).map(count => (
                  <button
                    key={count}
                    onClick={() => setMeta(prev => ({ ...prev, playerCount: count }))}
                    className={`flex-1 py-2 rounded-md text-xs ${
                      meta.playerCount === count
                        ? 'bg-[#C4463A] text-[#F6F1E4]'
                        : 'bg-[#26382C] text-[#9FAF9E]'
                    }`}
                  >
                    {count} 人麻将
                  </button>
                ))}
              </div>
            </div>

            {meta.playerCount === 3 && (
              <div>
                <p className="text-xs text-[#9FAF9E] mb-1">三麻自摸分配</p>
                <div className="flex flex-wrap gap-1.5">
                  {THREE_PLAYER_TSUMO_RULES.map(rule => (
                    <button
                      key={rule.id}
                      onClick={() => setMeta(prev => ({ ...prev, threePlayerTsumoRule: rule.id }))}
                      className={`px-2 py-1 rounded text-[10px] ${
                        meta.threePlayerTsumoRule === rule.id
                          ? 'bg-[#C9A24B] text-[#0F1A15]'
                          : 'bg-[#26382C] text-[#9FAF9E]'
                      }`}
                    >
                      {rule.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-[#9FAF9E] mb-1">玩家</p>
              <div className="space-y-2">
                {visibleNames.map((name, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-[#9FAF9E] w-6">
                      {['东', '南', '西', '北'][i]}
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={e =>
                        setMeta(prev => {
                          const next = [...prev.playerNames];
                          next[i] = e.target.value;
                          return { ...prev, playerNames: next };
                        })
                      }
                      className="flex-1 bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2 text-sm text-[#EFE9DA] focus:outline-none focus:border-[#C9A24B]/50"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#9FAF9E]">起始点数</span>
              <input
                type="number"
                value={meta.startScore}
                onChange={e =>
                  setMeta(prev => ({ ...prev, startScore: parseInt(e.target.value) || 0 }))
                }
                className="flex-1 bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2 text-sm text-[#EFE9DA] focus:outline-none focus:border-[#C9A24B]/50"
              />
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-[#C4463A] leading-relaxed">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={busy || !configured}
            className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#C4463A] text-[#F6F1E4] rounded-lg text-sm font-medium btn-vermillion disabled:opacity-40"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            创建并进入房间
          </button>
        </section>

        <p className="text-[10px] text-[#55695B] leading-relaxed px-1">
          房间不需要登录。拿到房间号的人都能查看并修改这局的记录——房间里没有权限区分，
          转发房间号等于把编辑权也给出去了。
        </p>
      </main>
    </div>
  );
}
