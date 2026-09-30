'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  PhotoScoringPanel,
  type PhotoRoundDraft,
} from '@/components/calculator/PhotoScoringPanel';
import {
  addRound,
  decideMember,
  deleteRound,
  fetchRoomStatus,
  listPendingMembers,
  requestJoin,
  type RoomStatus,
} from '@/lib/room/api';
import {
  computeStandings,
  getRoomToken,
  type PendingMember,
  type RoundPayload,
} from '@/lib/room/types';
import { currentDisplayName } from '@/lib/auth/local-account';

const POLL_INTERVAL_MS = 3000;

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = (params?.code ?? '').toUpperCase();

  const [token, setToken] = useState('');
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState<RoomStatus | null>(null);
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const loadedOnce = useRef(false);

  useEffect(() => {
    setToken(getRoomToken(code));
    setNickname(currentDisplayName() || '玩家');
  }, [code]);

  const refresh = useCallback(async () => {
    if (!token) return;
    const result = await fetchRoomStatus(code, token);
    if (!result.ok || !result.data) {
      setError(result.error ?? '读取房间失败');
    } else {
      setError(null);
      setStatus(result.data);
      if (result.data.member?.isHost) {
        const list = await listPendingMembers(code, token);
        setPending(list.ok ? (list.data ?? []) : []);
      }
    }
    if (!loadedOnce.current) {
      loadedOnce.current = true;
      setLoading(false);
    }
  }, [code, token]);

  useEffect(() => {
    if (!token) return;
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh, token]);

  const member = status?.member ?? null;
  const approved = member?.status === 'approved';
  const meta = status?.room?.meta;
  const rounds = useMemo(() => status?.rounds ?? [], [status]);
  const standings = useMemo(
    () => (meta ? computeStandings(meta, rounds) : []),
    [meta, rounds],
  );

  const handleApply = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await requestJoin(code, token, nickname || '玩家');
      if (!result.ok) {
        setNotice(result.error ?? '申请失败');
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleDecide = async (memberId: number, approve: boolean) => {
    setBusy(true);
    try {
      const result = await decideMember(code, memberId, token, approve);
      if (!result.ok) setNotice(result.error ?? '操作失败');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleApplyRound = async (draft: PhotoRoundDraft) => {
    if (!meta) return;
    setShowPhoto(false);
    setBusy(true);
    setNotice(null);
    try {
      const payload: RoundPayload = {
        roundName: `第${rounds.length + 1}局`,
        winnerIndex: draft.winnerIndex,
        loserIndex: draft.loserIndex,
        isTsumo: draft.isTsumo,
        honba: draft.honba,
        kyoutaku: draft.kyoutaku,
        han: draft.han,
        fu: draft.fu,
        yakuText: draft.yakuText,
        points: draft.points,
      };
      const result = await addRound(code, token, payload);
      if (!result.ok) {
        setNotice(result.error ?? '提交失败');
        return;
      }
      await refresh();
      setNotice('已记录本局');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    setBusy(true);
    try {
      const result = await deleteRound(code, token, id);
      if (!result.ok) setNotice(result.error ?? '删除失败');
      setPendingDelete(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setNotice('房间号已复制，发给其他玩家即可申请加入');
    } catch {
      setNotice(`房间号：${code}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <header className="sticky top-0 z-50 bg-[#0F1A15]/95 backdrop-blur-sm border-b border-[#26382C]">
        <div className="flex items-center gap-2 px-4 py-3 max-w-lg mx-auto w-full">
          <Link href="/room" className="p-2 -ml-2 text-[#9FAF9E] hover:text-[#EFE9DA] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#17251D] border border-[#26382C] hover:border-[#C9A24B]/50 transition-colors"
          >
            <span className="text-base font-bold tracking-[0.2em] text-[#C9A24B]">{code}</span>
            <Copy className="w-3.5 h-3.5 text-[#9FAF9E]" />
          </button>
          <button
            onClick={() => void refresh()}
            className="ml-auto p-2 text-[#9FAF9E] hover:text-[#EFE9DA] transition-colors"
            aria-label="刷新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-16 text-[#9FAF9E]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            读取房间中…
          </div>
        )}

        {!loading && error && (
          <section className="bg-[#C4463A]/10 border border-[#C4463A]/30 rounded-lg p-4">
            <p className="text-sm text-[#C4463A]">{error}</p>
          </section>
        )}

        {/* 房间不存在 */}
        {!loading && !error && status && status.room === null && (
          <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-6 text-center">
            <p className="text-sm text-[#EFE9DA]">房间 {code} 不存在</p>
            <p className="text-xs text-[#9FAF9E] mt-1">请确认房间号是否抄错</p>
            <Link href="/room" className="text-xs text-[#C9A24B] underline mt-3 inline-block">
              返回房间列表
            </Link>
          </section>
        )}

        {/* 申请加入 */}
        {!loading && !error && status?.room && (!member || member.status === 'rejected') && (
          <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
            <h2 className="text-sm font-serif font-bold text-[#C9A24B] mb-2 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              申请加入
            </h2>
            {member?.status === 'rejected' && (
              <p className="text-xs text-[#C4463A] mb-2">
                上次申请被拒绝了，可以改个名字再申请一次。
              </p>
            )}
            <p className="text-xs text-[#9FAF9E] leading-relaxed mb-3">
              房间需要房主审核。填一个名字提交申请，房主通过后就能一起记分。
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="你的名字"
                className="flex-1 bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2 text-sm text-[#EFE9DA] placeholder-[#55695B] focus:outline-none focus:border-[#C9A24B]/60"
              />
              <button
                onClick={handleApply}
                disabled={busy || !nickname.trim()}
                className="px-4 py-2 bg-[#C4463A] text-[#F6F1E4] rounded-md text-xs font-medium btn-vermillion disabled:opacity-40"
              >
                申请加入
              </button>
            </div>
            {notice && <p className="text-xs text-[#C4463A] mt-2">{notice}</p>}
          </section>
        )}

        {/* 等待审核 */}
        {!loading && !error && member?.status === 'pending' && (
          <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-6 text-center">
            <Loader2 className="w-6 h-6 text-[#C9A24B] animate-spin mx-auto mb-3" />
            <p className="text-sm text-[#EFE9DA]">等待房主审核</p>
            <p className="text-xs text-[#9FAF9E] mt-1">
              这一页会自动刷新，通过后就能看到对局记录
            </p>
          </section>
        )}

        {!loading && approved && meta && (
          <>
            {member?.isHost && pending.length > 0 && (
              <section className="bg-[#C9A24B]/10 border border-[#C9A24B]/30 rounded-lg p-4">
                <h2 className="text-sm font-medium text-[#C9A24B] mb-2">
                  加入申请（{pending.length}）
                </h2>
                <div className="space-y-2">
                  {pending.map(request => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between bg-[#0F1A15] rounded-md px-3 py-2"
                    >
                      <span className="text-xs text-[#EFE9DA]">{request.nickname || '匿名'}</span>
                      <span className="flex gap-2">
                        <button
                          onClick={() => void handleDecide(request.id, true)}
                          disabled={busy}
                          className="flex items-center gap-1 px-2 py-1 bg-[#5B8C5A] text-[#F6F1E4] rounded text-[10px] font-medium disabled:opacity-40"
                        >
                          <Check className="w-3 h-3" />
                          通过
                        </button>
                        <button
                          onClick={() => void handleDecide(request.id, false)}
                          disabled={busy}
                          className="flex items-center gap-1 px-2 py-1 bg-[#26382C] text-[#9FAF9E] rounded text-[10px] disabled:opacity-40"
                        >
                          <X className="w-3 h-3" />
                          拒绝
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
              <h2 className="text-sm font-serif font-bold text-[#C9A24B] mb-3">
                当前顺位 · {meta.playerCount}人麻将
              </h2>
              <div className="space-y-2">
                {standings.map((player, rank) => (
                  <div
                    key={player.index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      rank === 0 ? 'bg-[#C9A24B]/10 border border-[#C9A24B]/30' : 'bg-[#0F1A15]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          rank === 0 ? 'bg-[#C9A24B] text-[#0F1A15]' : 'bg-[#26382C] text-[#9FAF9E]'
                        }`}
                      >
                        {rank + 1}
                      </span>
                      <span className="text-sm text-[#EFE9DA]">{player.name}</span>
                      <span className="text-xs text-[#9FAF9E]">
                        {['东', '南', '西', '北'][player.index]}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        player.score >= meta.startScore ? 'text-[#EFE9DA]' : 'text-[#C4463A]'
                      }`}
                    >
                      {player.score.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <button
              onClick={() => setShowPhoto(true)}
              disabled={busy}
              className="w-full flex items-center justify-center gap-1.5 py-3 bg-[#C4463A] text-[#F6F1E4] rounded-lg text-sm font-medium btn-vermillion disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              拍照算分并记录本局
            </button>

            {notice && <p className="text-xs text-[#C9A24B] px-1">{notice}</p>}

            <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
              <h2 className="text-sm font-serif font-bold text-[#C9A24B] mb-3">
                对局记录（{rounds.length} 局）
              </h2>
              {rounds.length === 0 ? (
                <p className="text-xs text-[#9FAF9E] text-center py-4">
                  还没有记录，点上面的按钮拍一张和牌照片
                </p>
              ) : (
                <div className="space-y-2">
                  {rounds.map(round => (
                    <div key={round.id} className="bg-[#0F1A15] rounded-md p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[#EFE9DA]">
                          {round.payload.roundName}
                        </span>
                        <span className="text-xs text-[#9FAF9E]">
                          {round.payload.isTsumo ? '自摸' : '荣和'}
                          {round.payload.han > 0 && ` ${round.payload.han}番`}
                          {round.payload.fu > 0 && !round.payload.isTsumo && ` ${round.payload.fu}符`}
                        </span>
                      </div>
                      {round.payload.yakuText && (
                        <p className="text-[10px] text-[#9FAF9E] mb-1">{round.payload.yakuText}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {meta.playerNames.map((name, i) => {
                          const delta = round.payload.points[i] ?? 0;
                          return (
                            <span
                              key={i}
                              className={`text-xs ${
                                delta > 0
                                  ? 'text-[#5B8C5A]'
                                  : delta < 0
                                    ? 'text-[#C4463A]'
                                    : 'text-[#9FAF9E]'
                              }`}
                            >
                              {name}: {delta > 0 ? '+' : ''}
                              {delta}
                            </span>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-[#55695B]">
                          {round.created_by ? `${round.created_by} 提交` : '匿名提交'}
                        </span>
                        {pendingDelete === round.id ? (
                          <span className="flex items-center gap-2">
                            <button
                              onClick={() => void handleDelete(round.id)}
                              className="text-[10px] text-[#C4463A] font-medium"
                            >
                              确认删除
                            </button>
                            <button
                              onClick={() => setPendingDelete(null)}
                              className="text-[10px] text-[#9FAF9E]"
                            >
                              取消
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setPendingDelete(round.id)}
                            className="text-[#9FAF9E] hover:text-[#C4463A] transition-colors"
                            aria-label="删除这一局"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <p className="text-[10px] text-[#55695B] leading-relaxed px-1">
              房间每 3 秒自动同步。已通过的成员都能提交或删除记录。
            </p>
          </>
        )}
      </main>

      {showPhoto && meta && (
        <PhotoScoringPanel
          playerNames={meta.playerNames}
          playerCount={meta.playerCount}
          threePlayerTsumoRule={meta.threePlayerTsumoRule}
          onApply={handleApplyRound}
          onClose={() => setShowPhoto(false)}
        />
      )}
    </div>
  );
}
