'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, ChevronDown, ChevronUp, Trash2, Edit2, Camera } from 'lucide-react';
import Link from 'next/link';
import {
  PhotoScoringPanel,
  type PhotoRoundDraft,
} from '@/components/calculator/PhotoScoringPanel';
import {
  THREE_PLAYER_TSUMO_RULES,
  type PlayerCount,
  type ThreePlayerTsumoRule,
} from '@/lib/mahjong/scoring';

interface Player {
  name: string;
  score: number;
}

interface RoundResult {
  roundName: string;
  honba: number;
  kyoutaku: number;
  winnerIdx: number | null;
  loserIdx: number | null;
  isTsumo: boolean;
  points: number[]; // score changes for each player
  yakuText: string;
}

interface GameData {
  id: string;
  players: Player[];
  rounds: RoundResult[];
  startTime: number;
  isFinished: boolean;
  /** 三人局 / 四人局以及三麻自摸分配规则 */
  rules?: GameRules;
}

interface GameRules {
  playerCount: PlayerCount;
  threePlayerTsumoRule: ThreePlayerTsumoRule;
}

const DEFAULT_RULES: GameRules = { playerCount: 4, threePlayerTsumoRule: 'split-half' };

/** 三麻只有东・南・西三个座位 */
function seatWinds(playerCount: number): string[] {
  return ['东', '南', '西', '北'].slice(0, playerCount);
}

const STORAGE_KEY = 'mahjong-game-history';

function loadGames(): GameData[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data) as GameData[];
    // 兼容早期没有 rules 字段的记录
    return parsed.map(game => ({ ...game, rules: game.rules ?? DEFAULT_RULES }));
  } catch {
    return [];
  }
}

function saveGames(games: GameData[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

export default function GamePage() {
  const [games, setGames] = useState<GameData[]>([]);
  const [activeGame, setActiveGame] = useState<GameData | null>(null);
  const [showNewGame, setShowNewGame] = useState(false);
  const [showRoundInput, setShowRoundInput] = useState(false);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);

  useEffect(() => {
    setGames(loadGames());
  }, []);

  // Create new game
  const createGame = (names: string[], startScore: number, rules: GameRules) => {
    const game: GameData = {
      id: Date.now().toString(),
      players: names.map(name => ({
        name,
        score: startScore,
      })),
      rounds: [],
      startTime: Date.now(),
      isFinished: false,
      rules,
    };
    const newGames = [game, ...games];
    setGames(newGames);
    saveGames(newGames);
    setActiveGame(game);
    setShowNewGame(false);
  };

  // Add round result
  const addRound = (round: RoundResult) => {
    if (!activeGame) return;
    const updated = {
      ...activeGame,
      rounds: [...activeGame.rounds, round],
      players: activeGame.players.map((p, i) => ({
        ...p,
        score: p.score + (round.points[i] || 0),
      })),
    };
    setActiveGame(updated);
    const newGames = games.map(g => g.id === updated.id ? updated : g);
    setGames(newGames);
    saveGames(newGames);
    setShowRoundInput(false);
  };

  // Finish game
  const finishGame = () => {
    if (!activeGame) return;
    const updated = { ...activeGame, isFinished: true };
    setActiveGame(updated);
    const newGames = games.map(g => g.id === updated.id ? updated : g);
    setGames(newGames);
    saveGames(newGames);
  };

  // Delete game
  const deleteGame = (id: string) => {
    const newGames = games.filter(g => g.id !== id);
    setGames(newGames);
    saveGames(newGames);
    if (activeGame?.id === id) setActiveGame(null);
  };

  // Get rankings
  const getRankings = (players: Player[]) => {
    return [...players].sort((a, b) => b.score - a.score);
  };

  // Active game view
  if (activeGame && !showNewGame) {
    const rankings = getRankings(activeGame.players);
    return (
      <div className="min-h-screen flex flex-col pb-20">
        <header className="sticky top-0 z-50 bg-[#0F1A15]/95 backdrop-blur-sm border-b border-[#26382C]">
          <div className="flex items-center px-4 py-3">
            <button
              onClick={() => setActiveGame(null)}
              className="p-2 -ml-2 mr-2 text-[#9FAF9E] hover:text-[#EFE9DA]"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-serif font-bold text-[#EFE9DA]">对局进行中</h1>
            {!activeGame.isFinished && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setShowRoundInput(true)}
                  className="px-3 py-1.5 bg-[#C4463A] text-[#F6F1E4] rounded-lg text-xs font-medium btn-vermillion"
                >
                  录入本局
                </button>
                <button
                  onClick={finishGame}
                  className="px-3 py-1.5 bg-[#26382C] text-[#EFE9DA] rounded-lg text-xs font-medium"
                >
                  结束对局
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
          {/* Rankings */}
          <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
            <h3 className="text-sm font-serif font-bold text-[#C9A24B] mb-3">
              {activeGame.isFinished ? '最终顺位' : '当前顺位'}
            </h3>
            <div className="space-y-2">
              {rankings.map((p, i) => {
                const origIdx = activeGame.players.findIndex(op => op.name === p.name);
                return (
                  <div
                    key={p.name}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      i === 0 ? 'bg-[#C9A24B]/10 border border-[#C9A24B]/30' : 'bg-[#0F1A15]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-[#C9A24B] text-[#0F1A15]' :
                        i === 1 ? 'bg-[#9FAF9E] text-[#0F1A15]' :
                        i === 2 ? 'bg-[#4E634F] text-[#EFE9DA]' :
                        'bg-[#26382C] text-[#9FAF9E]'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="text-sm text-[#EFE9DA]">{p.name}</span>
                      <span className="text-xs text-[#9FAF9E]">
                        {seatWinds(activeGame.players.length)[origIdx]}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${p.score >= 0 ? 'text-[#EFE9DA]' : 'text-[#C4463A]'}`}>
                        {p.score.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Round History */}
          <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
            <h3 className="text-sm font-serif font-bold text-[#C9A24B] mb-3">
              对局记录 ({activeGame.rounds.length}局)
            </h3>
            {activeGame.rounds.length === 0 ? (
              <p className="text-xs text-[#9FAF9E] text-center py-4">暂无记录</p>
            ) : (
              <div className="space-y-2">
                {activeGame.rounds.map((round, i) => (
                  <div key={i} className="bg-[#0F1A15] rounded-md p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#EFE9DA]">{round.roundName}</span>
                      <span className="text-xs text-[#9FAF9E]">
                        {round.isTsumo ? '自摸' : '荣和'}
                        {round.honba > 0 && ` ${round.honba}本场`}
                      </span>
                    </div>
                    {round.yakuText && (
                      <p className="text-[10px] text-[#9FAF9E] mb-1">{round.yakuText}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {activeGame.players.map((p, pi) => (
                        <span key={pi} className={`text-xs ${
                          (round.points[pi] || 0) > 0 ? 'text-[#5B8C5A]' :
                          (round.points[pi] || 0) < 0 ? 'text-[#C4463A]' :
                          'text-[#9FAF9E]'
                        }`}>
                          {p.name}: {(round.points[pi] || 0) > 0 ? '+' : ''}{round.points[pi] || 0}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        {showRoundInput && (
          <RoundInputModal
            players={activeGame.players}
            roundNumber={activeGame.rounds.length + 1}
            rules={activeGame.rules ?? DEFAULT_RULES}
            onSubmit={addRound}
            onClose={() => setShowRoundInput(false)}
          />
        )}
      </div>
    );
  }

  // Game list view
  return (
    <div className="min-h-screen flex flex-col pb-20">
      <header className="sticky top-0 z-50 bg-[#0F1A15]/95 backdrop-blur-sm border-b border-[#26382C]">
        <div className="flex items-center px-4 py-3">
          <Link href="/" className="p-2 -ml-2 mr-2 text-[#9FAF9E] hover:text-[#EFE9DA]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-serif font-bold text-[#EFE9DA]">一局计分</h1>
          <button
            onClick={() => setShowNewGame(true)}
            className="ml-auto px-3 py-1.5 bg-[#C4463A] text-[#F6F1E4] rounded-lg text-xs font-medium btn-vermillion"
          >
            新对局
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        {games.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-[#26382C] mx-auto mb-3" />
            <p className="text-sm text-[#9FAF9E]">暂无对局记录</p>
            <p className="text-xs text-[#9FAF9E] mt-1">点击「新对局」开始记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map(game => (
              <div
                key={game.id}
                className="bg-[#17251D] rounded-lg border border-[#26382C] overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => {
                    if (game.isFinished) {
                      setExpandedGame(expandedGame === game.id ? null : game.id);
                    } else {
                      setActiveGame(game);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#EFE9DA]">
                          {new Date(game.startTime).toLocaleDateString('ja-JP')}
                        </span>
                        {game.isFinished ? (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#5B8C5A]/20 text-[#5B8C5A] rounded">已结束</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#C4463A]/20 text-[#C4463A] rounded">进行中</span>
                        )}
                      </div>
                      <p className="text-xs text-[#9FAF9E] mt-1">
                        {game.players.map(p => p.name).join(' / ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!game.isFinished && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveGame(game); }}
                          className="p-1.5 text-[#9FAF9E] hover:text-[#EFE9DA]"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteGame(game.id); }}
                        className="p-1.5 text-[#9FAF9E] hover:text-[#C4463A]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {game.isFinished && (
                        expandedGame === game.id ? <ChevronUp className="w-4 h-4 text-[#9FAF9E]" /> : <ChevronDown className="w-4 h-4 text-[#9FAF9E]" />
                      )}
                    </div>
                  </div>

                  {/* Mini rankings */}
                  <div className="flex gap-3 mt-2">
                    {getRankings(game.players).map((p, i) => (
                      <span key={p.name} className="text-xs text-[#9FAF9E]">
                        {i + 1}. {p.name} ({p.score.toLocaleString()})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expanded details */}
                {expandedGame === game.id && game.isFinished && (
                  <div className="px-4 pb-4 border-t border-[#26382C]">
                    <div className="mt-3 space-y-2">
                      {game.rounds.map((round, i) => (
                        <div key={i} className="bg-[#0F1A15] rounded p-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-[#EFE9DA]">{round.roundName}</span>
                            <span className="text-[#9FAF9E]">
                              {round.isTsumo ? '自摸' : '荣和'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {game.players.map((p, pi) => (
                              <span key={pi} className={`text-[10px] ${
                                (round.points[pi] || 0) > 0 ? 'text-[#5B8C5A]' :
                                (round.points[pi] || 0) < 0 ? 'text-[#C4463A]' :
                                'text-[#9FAF9E]'
                              }`}>
                                {p.name}: {(round.points[pi] || 0) > 0 ? '+' : ''}{round.points[pi] || 0}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {showNewGame && (
        <NewGameModal
          onCreate={createGame}
          onClose={() => setShowNewGame(false)}
        />
      )}
    </div>
  );
}

function NewGameModal({ onCreate, onClose }: {
  onCreate: (names: string[], score: number, rules: GameRules) => void;
  onClose: () => void;
}) {
  const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
  const [tsumoRule, setTsumoRule] = useState<ThreePlayerTsumoRule>('split-half');
  const [names, setNames] = useState(['玩家1', '玩家2', '玩家3', '玩家4']);
  const [startScore, setStartScore] = useState(25000);
  const visibleNames = names.slice(0, playerCount);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0F1A15]/95 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#17251D] rounded-lg border border-[#26382C] p-5 max-h-[88vh] overflow-y-auto">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-4">新建对局</h3>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-[#9FAF9E] mb-1">人数</p>
            <div className="flex gap-2">
              {([4, 3] as PlayerCount[]).map(count => (
                <button
                  key={count}
                  onClick={() => setPlayerCount(count)}
                  className={`flex-1 py-2 rounded-md text-xs ${
                    playerCount === count
                      ? 'bg-[#C4463A] text-[#F6F1E4]'
                      : 'bg-[#26382C] text-[#9FAF9E]'
                  }`}
                >
                  {count} 人麻将
                </button>
              ))}
            </div>
            {playerCount === 3 && (
              <p className="text-[10px] text-[#9FAF9E] mt-1 leading-relaxed">
                三麻只有东・南・西三个座位，没有北家，因此自摸时只有两家支付。
              </p>
            )}
          </div>

          {playerCount === 3 && (
            <div>
              <p className="text-xs text-[#9FAF9E] mb-1">三麻自摸分配规则</p>
              <div className="space-y-1">
                {THREE_PLAYER_TSUMO_RULES.map(rule => (
                  <button
                    key={rule.id}
                    onClick={() => setTsumoRule(rule.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-md border ${
                      tsumoRule === rule.id
                        ? 'border-[#C9A24B] bg-[#C9A24B]/10'
                        : 'border-[#26382C] bg-[#0F1A15]'
                    }`}
                  >
                    <span className="text-xs text-[#EFE9DA]">{rule.name}</span>
                    <span className="block text-[10px] text-[#9FAF9E] mt-0.5 leading-relaxed">
                      {rule.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {visibleNames.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-[#9FAF9E] w-6">{seatWinds(playerCount)[i]}</span>
              <input
                type="text"
                value={name}
                onChange={e => {
                  const newNames = [...names];
                  newNames[i] = e.target.value;
                  setNames(newNames);
                }}
                className="flex-1 bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2 text-sm text-[#EFE9DA] focus:outline-none focus:border-[#C9A24B]/50"
              />
            </div>
          ))}

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9FAF9E]">起始点数</span>
            <input
              type="number"
              value={startScore}
              onChange={e => setStartScore(parseInt(e.target.value) || 0)}
              className="flex-1 bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2 text-sm text-[#EFE9DA] focus:outline-none focus:border-[#C9A24B]/50"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-[#26382C] text-[#EFE9DA] rounded-lg text-sm font-medium"
          >
            取消
          </button>
          <button
            onClick={() =>
              onCreate(visibleNames, startScore, {
                playerCount,
                threePlayerTsumoRule: tsumoRule,
              })
            }
            className="flex-1 py-2.5 bg-[#C4463A] text-[#F6F1E4] rounded-lg text-sm font-medium btn-vermillion"
          >
            开始
          </button>
        </div>
      </div>
    </div>
  );
}

function RoundInputModal({ players, roundNumber, rules, onSubmit, onClose }: {
  players: Player[];
  roundNumber: number;
  rules: GameRules;
  onSubmit: (round: RoundResult) => void;
  onClose: () => void;
}) {
  const [roundName, setRoundName] = useState(`第${roundNumber}局`);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const [loserIdx, setLoserIdx] = useState<number | null>(null);
  const [isTsumo, setIsTsumo] = useState(false);
  const [points, setPoints] = useState<number[]>(() => players.map(() => 0));
  const [honba, setHonba] = useState(0);
  const [yakuText, setYakuText] = useState('');
  const [showPhoto, setShowPhoto] = useState(false);

  /** 把拍照算分的结果直接写进本局表单 */
  const applyPhotoDraft = (draft: PhotoRoundDraft) => {
    setWinnerIdx(draft.winnerIndex);
    setLoserIdx(draft.loserIndex);
    setIsTsumo(draft.isTsumo);
    setPoints(draft.points);
    setHonba(draft.honba);
    const detail = `${draft.han}番${draft.isTsumo ? '' : ` ${draft.fu}符`}`;
    setYakuText(draft.yakuText ? `${draft.yakuText} ${detail}` : detail);
    setShowPhoto(false);
  };

  const handlePointChange = (idx: number, value: number) => {
    const newPoints = [...points];
    newPoints[idx] = value;
    setPoints(newPoints);
  };

  const handleSubmit = () => {
    onSubmit({
      roundName,
      honba,
      kyoutaku: 0,
      winnerIdx,
      loserIdx,
      isTsumo,
      points,
      yakuText,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0F1A15]/95 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-sm bg-[#17251D] rounded-t-lg sm:rounded-lg border border-[#26382C] p-5 max-h-[80vh] overflow-y-auto">
        <h3 className="text-base font-serif font-bold text-[#C9A24B] mb-3">录入本局</h3>

        <button
          onClick={() => setShowPhoto(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 mb-3 bg-[#26382C] border border-[#C9A24B]/40 text-[#C9A24B] rounded-lg text-xs font-medium hover:bg-[#31473A] transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
          拍照算分（自动填入点数）
        </button>

        <div className="space-y-3">
          {/* Round name */}
          <div>
            <label className="text-xs text-[#9FAF9E] mb-1 block">局名</label>
            <input
              type="text"
              value={roundName}
              onChange={e => setRoundName(e.target.value)}
              className="w-full bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2 text-sm text-[#EFE9DA] focus:outline-none focus:border-[#C9A24B]/50"
            />
          </div>

          {/* Winner */}
          <div>
            <label className="text-xs text-[#9FAF9E] mb-1 block">和牌者</label>
            <div className="flex gap-2">
              {players.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setWinnerIdx(winnerIdx === i ? null : i)}
                  className={`flex-1 py-2 rounded-md text-xs transition-all ${
                    winnerIdx === i
                      ? 'bg-[#C4463A] text-[#F6F1E4]'
                      : 'bg-[#26382C] text-[#9FAF9E]'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tsumo/Ron */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsTsumo(false)}
              className={`flex-1 py-2 rounded-md text-xs transition-all ${
                !isTsumo ? 'bg-[#C4463A] text-[#F6F1E4]' : 'bg-[#26382C] text-[#9FAF9E]'
              }`}
            >
              荣和
            </button>
            <button
              onClick={() => setIsTsumo(true)}
              className={`flex-1 py-2 rounded-md text-xs transition-all ${
                isTsumo ? 'bg-[#C4463A] text-[#F6F1E4]' : 'bg-[#26382C] text-[#9FAF9E]'
              }`}
            >
              自摸
            </button>
          </div>

          {/* Loser (for ron) */}
          {!isTsumo && (
            <div>
              <label className="text-xs text-[#9FAF9E] mb-1 block">放铳者</label>
              <div className="flex gap-2">
                {players.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setLoserIdx(loserIdx === i ? null : i)}
                    className={`flex-1 py-2 rounded-md text-xs transition-all ${
                      loserIdx === i
                        ? 'bg-[#C4463A] text-[#F6F1E4]'
                        : 'bg-[#26382C] text-[#9FAF9E]'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Points */}
          <div>
            <label className="text-xs text-[#9FAF9E] mb-1 block">各家点数变动</label>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-[#EFE9DA] w-12 truncate">{p.name}</span>
                  <input
                    type="number"
                    value={points[i]}
                    onChange={e => handlePointChange(i, parseInt(e.target.value) || 0)}
                    className="flex-1 bg-[#0F1A15] border border-[#26382C] rounded-md px-2 py-1.5 text-sm text-[#EFE9DA] focus:outline-none focus:border-[#C9A24B]/50"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Honba */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9FAF9E]">本场</span>
            <input
              type="number"
              value={honba}
              onChange={e => setHonba(parseInt(e.target.value) || 0)}
              className="w-16 bg-[#0F1A15] border border-[#26382C] rounded-md px-2 py-1.5 text-sm text-[#EFE9DA] focus:outline-none focus:border-[#C9A24B]/50"
            />
          </div>

          {/* Yaku text */}
          <div>
            <label className="text-xs text-[#9FAF9E] mb-1 block">役种/备注</label>
            <input
              type="text"
              value={yakuText}
              onChange={e => setYakuText(e.target.value)}
              placeholder="如: 立直 断幺九 3番30符"
              className="w-full bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2 text-sm text-[#EFE9DA] placeholder-[#55695B] focus:outline-none focus:border-[#C9A24B]/50"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-[#26382C] text-[#EFE9DA] rounded-lg text-sm font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 bg-[#C4463A] text-[#F6F1E4] rounded-lg text-sm font-medium btn-vermillion"
          >
            确认
          </button>
        </div>
      </div>

      {showPhoto && (
        <PhotoScoringPanel
          playerNames={players.map(p => p.name)}
          playerCount={rules.playerCount}
          threePlayerTsumoRule={rules.threePlayerTsumoRule}
          onApply={applyPhotoDraft}
          onClose={() => setShowPhoto(false)}
        />
      )}
    </div>
  );
}
