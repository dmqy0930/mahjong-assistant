'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Camera, Check, Plus, RefreshCw, Sparkles, Upload, X } from 'lucide-react';
import type { Mentsu, Tile, WinHandInput, WinType } from '@/lib/mahjong/types';
import { analyzeHand } from '@/lib/mahjong/hand';
import { calculatePoints, getLimitTypeName, getDoraTilesFromIndicators } from '@/lib/mahjong/calculator';
import { computeScoreChanges, type PlayerCount, type ThreePlayerTsumoRule } from '@/lib/mahjong/scoring';
import { createTile, sortTiles } from '@/lib/mahjong/tile-utils';
import { describePreparedImage, prepareImageForUpload } from '@/lib/ai/image';
import { readJsonResponse } from '@/lib/ai/http';
import { getActiveProviderConfig, loadAiSettings } from '@/lib/ai/storage';
import { YAKU_LIST } from '@/lib/mahjong/yaku';
import { TileDisplay } from './TileDisplay';
import { TilePicker } from './TilePicker';

export interface PhotoRoundDraft {
  winnerIndex: number;
  loserIndex: number | null;
  isTsumo: boolean;
  honba: number;
  kyoutaku: number;
  yakuText: string;
  han: number;
  fu: number;
  points: number[];
}

interface PhotoScoringPanelProps {
  playerNames: string[];
  playerCount: PlayerCount;
  threePlayerTsumoRule: ThreePlayerTsumoRule;
  /** 默认庄家座位（一般是本局起家） */
  defaultDealerIndex?: number;
  onApply: (draft: PhotoRoundDraft) => void;
  onClose: () => void;
}

/** 手牌按门清处理；副露手牌需要手工补选役种 */
const IS_MENZEN = true;
const NO_OPEN_MENTSU: Mentsu[] = [];

export function PhotoScoringPanel({
  playerNames,
  playerCount,
  threePlayerTsumoRule,
  defaultDealerIndex = 0,
  onApply,
  onClose,
}: PhotoScoringPanelProps) {
  const [handTiles, setHandTiles] = useState<Tile[]>([]);
  const [winTile, setWinTile] = useState<Tile | null>(null);
  const [doraIndicators, setDoraIndicators] = useState<Tile[]>([]);
  const [winType, setWinType] = useState<WinType>('normal');
  const [isTsumo, setIsTsumo] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState(0);
  const [loserIndex, setLoserIndex] = useState<number | null>(null);
  const [dealerIndex, setDealerIndex] = useState(defaultDealerIndex);
  const [honba, setHonba] = useState(0);
  const [kyoutaku, setKyoutaku] = useState(0);
  const [excludedYaku, setExcludedYaku] = useState<string[]>([]);
  const [extraYaku, setExtraYaku] = useState<string[]>([]);

  const [isRecognizing, setIsRecognizing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'hand' | 'dora' | 'win'>('hand');
  const [showPicker, setShowPicker] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    setError(null);
    setIsRecognizing(true);
    try {
      const prepared = await prepareImageForUpload(file);
      setImagePreview(prepared.dataUrl);
      setImageInfo(describePreparedImage(prepared));

      const provider = getActiveProviderConfig(loadAiSettings());
      const res = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: prepared.dataUrl, provider }),
      });
      const parsedResponse = await readJsonResponse(res);
      if (!parsedResponse.ok) {
        setError(parsedResponse.error ?? '识别失败');
        return;
      }
      const data = parsedResponse.data as Record<string, unknown> & {
        error?: string;
        probe?: { detectedType: string };
        _meta?: { warnings?: string[] };
        handTiles?: { suit: string; rank: number; isRed?: boolean }[];
        winTile?: { suit: string; rank: number };
        doraIndicators?: { suit: string; rank: number }[];
        doraTiles?: { suit: string; rank: number }[];
        winType?: WinType;
        isTsumo?: boolean;
      };
      if (data.error) {
        setError(`${data.error}${data.probe ? `（本次发送：${data.probe.detectedType}）` : ''}`);
        return;
      }
      const warnings: string[] = data._meta?.warnings ?? [];
      if (warnings.length > 0) {
        setError(`识别结果可能不准确：${warnings.join('；')}。请核对牌面后再应用。`);
      }
      if (!data.handTiles) return;

      const tiles: Tile[] = sortTiles(
        data.handTiles.map((t: { suit: string; rank: number; isRed?: boolean }) =>
          createTile(t.suit as Tile['suit'], t.rank, t.isRed || false),
        ),
      );
      const matchedWin = data.winTile
        ? tiles.find((t: Tile) => t.suit === data.winTile?.suit && t.rank === data.winTile?.rank)
        : undefined;
      const indicators: { suit: string; rank: number }[] =
        data.doraIndicators ?? data.doraTiles ?? [];

      setHandTiles(tiles);
      setWinTile(matchedWin ?? tiles[tiles.length - 1] ?? null);
      setWinType(data.winType || 'normal');
      setIsTsumo(Boolean(data.isTsumo));
      setDoraIndicators(indicators.map(t => createTile(t.suit as Tile['suit'], t.rank)));
      setExcludedYaku([]);
      setExtraYaku([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别失败，请手动录入牌面');
    } finally {
      setIsRecognizing(false);
    }
  }, []);

  const addTile = (tile: Tile) => {
    if (pickerTarget === 'dora') setDoraIndicators(prev => [...prev, tile]);
    else if (pickerTarget === 'win') {
      setHandTiles(prev => sortTiles([...prev, tile]));
      setWinTile(tile);
    } else setHandTiles(prev => sortTiles([...prev, tile]));
    setShowPicker(false);
  };

  const analysis = useMemo(() => {
    const expected = 14 - NO_OPEN_MENTSU.length * 3;
    if (!winTile || handTiles.length !== expected) return null;
    return analyzeHand({
      handTiles,
      openMentsu: NO_OPEN_MENTSU,
      winTile,
      agariType: isTsumo ? 'tsumo' : 'ron',
      isMenzen: IS_MENZEN,
      playerWind: (['east', 'south', 'west', 'north'] as const)[winnerIndex % 4],
      baWind: 'east',
    });
  }, [handTiles, winTile, isTsumo, winnerIndex]);

  const autoYaku = useMemo(
    () => (analysis?.isAgari ? analysis.yakuIds : []),
    [analysis],
  );
  const effectiveYaku = useMemo(
    () =>
      Array.from(new Set([...autoYaku, ...extraYaku])).filter(id => !excludedYaku.includes(id)),
    [autoYaku, extraYaku, excludedYaku],
  );

  const isDealer = winnerIndex === dealerIndex;

  const result = useMemo(() => {
    if (!analysis?.isAgari || !winTile) return null;
    const input: WinHandInput = {
      handTiles,
      openMentsu: NO_OPEN_MENTSU,
      winTile,
      winType: analysis.winType ?? winType,
      agariType: isTsumo ? 'tsumo' : 'ron',
      isMenzen: IS_MENZEN,
      isTsumo,
      isDealer,
      playerWind: (['east', 'south', 'west', 'north'] as const)[winnerIndex % 4],
      baWind: 'east',
      doraTiles: getDoraTilesFromIndicators(doraIndicators),
      uraDoraTiles: [],
      redDoraCount: 0,
      isRiichi: false,
      isDoubleRiichi: false,
      isIppatsu: false,
      isLastTile: false,
      isLastDraw: false,
      isFirstDraw: false,
      isTenhou: false,
      isChiihou: false,
      honba,
      kyoutaku,
      tenpaiType: analysis.tenpaiType,
      selectedYaku: effectiveYaku,
      isFuriten: false,
      janto: analysis.janto,
      mentsu: analysis.mentsu,
      isMenzenTsumo: IS_MENZEN && isTsumo,
    };
    try {
      return calculatePoints(input);
    } catch {
      return null;
    }
  }, [
    analysis,
    handTiles,
    winTile,
    winType,
    isTsumo,
    isDealer,
    winnerIndex,
    doraIndicators,
    honba,
    kyoutaku,
    effectiveYaku,
  ]);

  const changes = useMemo(() => {
    if (!result?.hasYaku) return null;
    return computeScoreChanges({
      basicPoints: result.basicPoints,
      isDealer,
      isTsumo,
      playerCount,
      threePlayerTsumoRule,
      honba,
      kyoutaku,
      winnerIndex,
      dealerIndex,
      loserIndex,
    });
  }, [
    result,
    isDealer,
    isTsumo,
    playerCount,
    threePlayerTsumoRule,
    honba,
    kyoutaku,
    winnerIndex,
    dealerIndex,
    loserIndex,
  ]);

  const canApply =
    Boolean(result?.hasYaku) &&
    Boolean(changes) &&
    (isTsumo || loserIndex !== null) &&
    playerNames.length === playerCount;

  const apply = () => {
    if (!result || !changes) return;
    onApply({
      winnerIndex,
      loserIndex: isTsumo ? null : loserIndex,
      isTsumo,
      honba,
      kyoutaku,
      yakuText: effectiveYaku
        .map(id => YAKU_LIST.find(y => y.id === id)?.name)
        .filter(Boolean)
        .join(' '),
      han: result.totalHan,
      fu: result.fu,
      points: changes.deltas,
    });
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#0F1A15]/95 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-sm bg-[#17251D] rounded-t-lg sm:rounded-lg border border-[#26382C] p-5 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-serif font-bold text-[#C9A24B]">拍照算分</h3>
          <button onClick={onClose} className="p-1.5 text-[#9FAF9E] hover:text-[#EFE9DA]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#C4463A] text-[#F6F1E4] rounded-lg text-xs font-medium btn-vermillion"
          >
            <Camera className="w-3.5 h-3.5" />
            拍照
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#26382C] text-[#EFE9DA] rounded-lg text-xs font-medium"
          >
            <Upload className="w-3.5 h-3.5" />
            相册
          </button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />

        {imagePreview && (
          <div className="mt-2 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="牌面预览" className="w-full rounded-lg max-h-32 object-cover" />
            {isRecognizing && (
              <div className="absolute inset-0 bg-[#0F1A15]/80 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-[#C9A24B] animate-spin" />
                <span className="ml-2 text-xs text-[#EFE9DA]">识别中...</span>
              </div>
            )}
          </div>
        )}
        {imageInfo && <p className="mt-1 text-[10px] text-[#55695B]">已上传：{imageInfo}</p>}
        {error && <p className="mt-2 text-xs text-[#C4463A] leading-relaxed">{error}</p>}

        {/* 手牌 */}
        <div className="mt-3">
          <p className="text-[10px] text-[#9FAF9E] mb-1">手牌（点击可删除）</p>
          <div className="flex flex-wrap gap-1 min-h-[3rem] p-2 bg-[#0F1A15] rounded-lg">
            {handTiles.map((tile, i) => (
              <button key={tile.id ?? i} onClick={() => setHandTiles(prev => prev.filter((_, j) => j !== i))}>
                <TileDisplay tile={tile} small />
              </button>
            ))}
            <button
              onClick={() => {
                setPickerTarget('hand');
                setShowPicker(true);
              }}
              className="w-7 h-9 flex items-center justify-center border border-dashed border-[#26382C] rounded text-[#9FAF9E]"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2 text-[10px] text-[#9FAF9E]">
            <span>和了牌</span>
            {winTile ? (
              <button
                onClick={() => {
                  setPickerTarget('win');
                  setShowPicker(true);
                }}
              >
                <TileDisplay tile={winTile} small />
              </button>
            ) : (
              <span>未选</span>
            )}
            <span className="ml-2">宝牌指示牌</span>
            <div className="flex gap-1">
              {doraIndicators.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setDoraIndicators(prev => prev.filter((_, j) => j !== i))}
                >
                  <TileDisplay tile={t} small />
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setPickerTarget('dora');
                setShowPicker(true);
              }}
              className="px-1.5 border border-dashed border-[#26382C] rounded"
            >
              +
            </button>
          </div>
        </div>

        {/* 谁和了 */}
        <div className="mt-3">
          <p className="text-[10px] text-[#9FAF9E] mb-1">和牌者</p>
          <div className="flex gap-1.5">
            {playerNames.map((name, i) => (
              <button
                key={i}
                onClick={() => setWinnerIndex(i)}
                className={`flex-1 py-1.5 rounded text-[10px] ${
                  winnerIndex === i ? 'bg-[#C4463A] text-[#F6F1E4]' : 'bg-[#26382C] text-[#9FAF9E]'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 mt-1.5">
            {(
              [
                { v: false, label: '荣和' },
                { v: true, label: '自摸' },
              ] as const
            ).map(opt => (
              <button
                key={String(opt.v)}
                onClick={() => setIsTsumo(opt.v)}
                className={`flex-1 py-1.5 rounded text-[10px] ${
                  isTsumo === opt.v ? 'bg-[#C4463A] text-[#F6F1E4]' : 'bg-[#26382C] text-[#9FAF9E]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {!isTsumo && (
            <>
              <p className="text-[10px] text-[#9FAF9E] mt-2 mb-1">放铳者</p>
              <div className="flex gap-1.5">
                {playerNames.map((name, i) => (
                  <button
                    key={i}
                    disabled={i === winnerIndex}
                    onClick={() => setLoserIndex(i)}
                    className={`flex-1 py-1.5 rounded text-[10px] disabled:opacity-30 ${
                      loserIndex === i ? 'bg-[#C4463A] text-[#F6F1E4]' : 'bg-[#26382C] text-[#9FAF9E]'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="text-[10px] text-[#9FAF9E] mt-2 mb-1">本局庄家</p>
          <div className="flex gap-1.5">
            {playerNames.map((name, i) => (
              <button
                key={i}
                onClick={() => setDealerIndex(i)}
                className={`flex-1 py-1.5 rounded text-[10px] ${
                  dealerIndex === i ? 'bg-[#C9A24B] text-[#0F1A15]' : 'bg-[#26382C] text-[#9FAF9E]'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-2">
            <NumberStepper label="本场" value={honba} onChange={setHonba} />
            <NumberStepper label="供托" value={kyoutaku} onChange={setKyoutaku} />
          </div>
        </div>

        {/* 自动判定 */}
        <div className="mt-3 rounded-lg border border-[#26382C] p-3">
          <p className="text-[10px] text-[#C9A24B] flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3" />
            自动判定
          </p>
          {analysis?.isAgari ? (
            <p className="text-[10px] text-[#9FAF9E]">
              {analysis.winType === 'chitoitsu' ? '七对子' : analysis.winType === 'kokushi' ? '国士无双' : '一般型'}
              {' · '}
              听牌形
              {
                { ryanmen: '两面', kanchan: '嵌张', penchan: '边张', tanki: '单骑', shanpon: '双碰' }[
                  analysis.tenpaiType
                ]
              }
            </p>
          ) : (
            <p className="text-[10px] text-[#9FAF9E]">
              {analysis?.message ?? `手牌 ${handTiles.length}/14 张`}
            </p>
          )}

          <div className="flex flex-wrap gap-1 mt-2">
            {YAKU_LIST.filter(y => !y.isYakuman).map(yaku => {
              const isAuto = autoYaku.includes(yaku.id);
              const selected = effectiveYaku.includes(yaku.id);
              return (
                <button
                  key={yaku.id}
                  onClick={() => {
                    // 自动判定出的役点一下=排除，其余点一下=手动补选
                    if (isAuto) {
                      setExcludedYaku(prev =>
                        prev.includes(yaku.id)
                          ? prev.filter(id => id !== yaku.id)
                          : prev.concat(yaku.id),
                      );
                    } else {
                      setExtraYaku(prev =>
                        prev.includes(yaku.id)
                          ? prev.filter(id => id !== yaku.id)
                          : prev.concat(yaku.id),
                      );
                    }
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    selected
                      ? isAuto
                        ? 'bg-[#C4463A] text-[#F6F1E4]'
                        : 'bg-[#C4463A]/60 text-[#F6F1E4]'
                      : 'bg-[#26382C] text-[#9FAF9E]'
                  }`}
                >
                  {yaku.name}
                  {isAuto && selected && <span className="ml-0.5 opacity-70">自动</span>}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {YAKU_LIST.filter(y => y.isYakuman).map(yaku => {
              const selected = effectiveYaku.includes(yaku.id);
              return (
                <button
                  key={yaku.id}
                  onClick={() =>
                    setExtraYaku(prev =>
                      prev.includes(yaku.id) ? prev.filter(id => id !== yaku.id) : prev.concat(yaku.id),
                    )
                  }
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    selected ? 'bg-[#C9A24B] text-[#0F1A15]' : 'bg-[#26382C] text-[#9FAF9E]'
                  }`}
                >
                  {yaku.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 结果 */}
        {result?.hasYaku && changes && (
          <div className="mt-3 rounded-lg bg-[#0F1A15] p-3">
            <p className="text-xs text-[#EFE9DA]">
              {result.totalHan} 番
              {!result.isYakuman && ` ${result.fu} 符`}
              {result.limitType !== 'none' && (
                <span className="ml-1.5 text-[#C9A24B]">{getLimitTypeName(result.limitType)}</span>
              )}
            </p>
            <p className="text-base font-bold text-[#C9A24B] mt-1">
              {isTsumo
                ? changes.payments.map(p => `${p.amount}`).join(' / ')
                : `${changes.payments[0]?.amount ?? 0} 点`}
            </p>
            <div className="mt-2 space-y-0.5">
              {playerNames.map((name, i) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span className="text-[#9FAF9E]">{name}</span>
                  <span
                    className={
                      changes.deltas[i] > 0
                        ? 'text-[#5B8C5A]'
                        : changes.deltas[i] < 0
                          ? 'text-[#C4463A]'
                          : 'text-[#9FAF9E]'
                    }
                  >
                    {changes.deltas[i] > 0 ? '+' : ''}
                    {changes.deltas[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {result && !result.hasYaku && (
          <p className="mt-3 text-xs text-[#C4463A]">无役不能和牌，请核对役种选择。</p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-[#26382C] text-[#EFE9DA] rounded-lg text-sm font-medium"
          >
            取消
          </button>
          <button
            onClick={apply}
            disabled={!canApply}
            className="flex-1 py-2.5 bg-[#C4463A] text-[#F6F1E4] rounded-lg text-sm font-medium btn-vermillion disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            应用本局
          </button>
        </div>
      </div>

      {showPicker && (
        <TilePicker
          onSelect={addTile}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function NumberStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-[#9FAF9E]">{label}</span>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-5 h-5 flex items-center justify-center bg-[#26382C] rounded text-[#EFE9DA] text-xs"
      >
        −
      </button>
      <span className="w-5 text-center text-[10px] text-[#EFE9DA]">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-5 h-5 flex items-center justify-center bg-[#26382C] rounded text-[#EFE9DA] text-xs"
      >
        +
      </button>
    </div>
  );
}
