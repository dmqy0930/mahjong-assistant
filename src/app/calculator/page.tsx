'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { ArrowLeft, Camera, Upload, RefreshCw, Plus, Minus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { Tile, WinHandInput, Mentsu, WinType, AgariType, PlayerWind, BaWind, TenpaiType } from '@/lib/mahjong/types';
import { YAKU_LIST } from '@/lib/mahjong/yaku';
import { calculatePoints, getLimitTypeName, getDoraTilesFromIndicators } from '@/lib/mahjong/calculator';
import { analyzeHand } from '@/lib/mahjong/hand';
import { createTile, sortTiles } from '@/lib/mahjong/tile-utils';
import { resolveProvider } from '@/lib/ai/providers';
import { getActiveProviderConfig, loadAiSettings } from '@/lib/ai/storage';
import { TileDisplay } from '@/components/calculator/TileDisplay';
import { TilePicker } from '@/components/calculator/TilePicker';

interface CalcState {
  handTiles: Tile[];
  openMentsu: Mentsu[];
  winTile: Tile | null;
  winTileId: string | null; // 手牌中作为「和了牌」的那张
  winType: WinType;
  agariType: AgariType;
  isMenzen: boolean;
  isTsumo: boolean;
  isDealer: boolean;
  playerWind: PlayerWind;
  baWind: BaWind;
  doraTiles: Tile[];
  uraDoraTiles: Tile[];
  redDoraCount: number;
  isRiichi: boolean;
  isDoubleRiichi: boolean;
  isIppatsu: boolean;
  isLastTile: boolean;
  isLastDraw: boolean;
  tenpaiType: TenpaiType;
  selectedYaku: string[];
  excludedYaku: string[]; // 被手动取消的自动判定役
  honba: number;
  kyoutaku: number;
}

const DEFAULT_STATE: CalcState = {
  handTiles: [],
  openMentsu: [],
  winTile: null,
  winTileId: null,
  winType: 'normal',
  agariType: 'ron',
  isMenzen: true,
  isTsumo: false,
  isDealer: false,
  playerWind: 'east',
  baWind: 'east',
  doraTiles: [],
  uraDoraTiles: [],
  redDoraCount: 0,
  isRiichi: false,
  isDoubleRiichi: false,
  isIppatsu: false,
  isLastTile: false,
  isLastDraw: false,
  tenpaiType: 'ryanmen',
  selectedYaku: [],
  excludedYaku: [],
  honba: 0,
  kyoutaku: 0,
};

const TENPAI_LABELS: Record<TenpaiType, string> = {
  ryanmen: '两面',
  kanchan: '嵌张',
  penchan: '边张',
  tanki: '单骑',
  shanpon: '双碰',
};

const WIN_TYPE_LABELS: Record<WinType, string> = {
  normal: '一般型',
  chitoitsu: '七对子',
  kokushi: '国士无双',
};

export default function CalculatorPage() {
  const [state, setState] = useState<CalcState>(DEFAULT_STATE);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [showTilePicker, setShowTilePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'hand' | 'dora' | 'win'>('hand');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiLabel, setAiLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 读取本地 API 配置，用于展示当前识别模型
  useEffect(() => {
    const stored = loadAiSettings();
    const provider = resolveProvider(getActiveProviderConfig(stored));
    setAiLabel(`${provider.name}${provider.model ? ` · ${provider.model}` : ''}`);
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      setIsRecognizing(true);

      try {
        const provider = getActiveProviderConfig(loadAiSettings());
        const res = await fetch('/api/recognize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, provider }),
        });
        const data = await res.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        // Parse recognition result
        if (data.handTiles) {
          const tiles: Tile[] = sortTiles(
            data.handTiles.map((t: { suit: string; rank: number; isRed?: boolean }) =>
              createTile(t.suit as Tile['suit'], t.rank, t.isRed || false),
            ),
          );
          const recognizedWin =
            data.winTile &&
            tiles.find(
              (t: Tile) => t.suit === data.winTile.suit && t.rank === data.winTile.rank,
            );
          const winTile: Tile | null = recognizedWin ?? tiles[tiles.length - 1] ?? null;
          const indicators: { suit: string; rank: number }[] =
            data.doraIndicators ?? data.doraTiles ?? [];
          setState(prev => ({
            ...prev,
            handTiles: tiles,
            winTile,
            winTileId: winTile?.id ?? null,
            winType: data.winType || 'normal',
            isTsumo: data.isTsumo || false,
            isMenzen: data.isMenzen !== false,
            doraTiles: indicators.map(t => createTile(t.suit as Tile['suit'], t.rank)),
          }));
        }
      } catch {
        setError('识别失败，请手动输入牌面');
      } finally {
        setIsRecognizing(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Add tile to hand
  const addTile = (tile: Tile) => {
    setState(prev => {
      if (pickerTarget === 'dora') {
        return { ...prev, doraTiles: [...prev.doraTiles, tile] };
      }
      if (pickerTarget === 'win') {
        // 重选和了牌时替换原牌，避免重复累加
        const tiles = [...prev.handTiles];
        const existing = prev.winTileId
          ? tiles.findIndex(t => t.id === prev.winTileId)
          : -1;
        if (existing >= 0) {
          tiles[existing] = tile;
          return { ...prev, handTiles: tiles, winTile: tile, winTileId: tile.id ?? null };
        }
        return {
          ...prev,
          handTiles: sortTiles([...tiles, tile]),
          winTile: tile,
          winTileId: tile.id ?? null,
        };
      }
      return { ...prev, handTiles: sortTiles([...prev.handTiles, tile]) };
    });
    setShowTilePicker(false);
  };

  // Remove tile from hand
  const removeTile = (index: number) => {
    setState(prev => {
      const removed = prev.handTiles[index];
      const clearsWinTile = !!removed && prev.winTileId === removed.id;
      return {
        ...prev,
        handTiles: prev.handTiles.filter((_, i) => i !== index),
        winTile: clearsWinTile ? null : prev.winTile,
        winTileId: clearsWinTile ? null : prev.winTileId,
      };
    });
  };

  // 手牌应张数：14 张减去每副副露占用的 3 张
  const expectedConcealed = 14 - state.openMentsu.length * 3;

  // 自动判定：和牌形 / 面子分解 / 听牌形 / 役种
  const analysis = useMemo(() => {
    if (!state.winTile) return null;
    if (state.handTiles.length !== expectedConcealed) return null;
    return analyzeHand({
      handTiles: state.handTiles,
      openMentsu: state.openMentsu,
      winTile: state.winTile,
      agariType: state.isTsumo ? 'tsumo' : 'ron',
      isMenzen: state.isMenzen,
      playerWind: state.playerWind,
      baWind: state.baWind,
    });
  }, [
    state.handTiles,
    state.openMentsu,
    state.winTile,
    state.isTsumo,
    state.isMenzen,
    state.playerWind,
    state.baWind,
    expectedConcealed,
  ]);

  const autoYakuIds = useMemo(
    () => (analysis?.isAgari ? analysis.yakuIds : []),
    [analysis],
  );
  const effectiveYaku = useMemo(
    () =>
      Array.from(new Set([...autoYakuIds, ...state.selectedYaku])).filter(
        id => !state.excludedYaku.includes(id),
      ),
    [autoYakuIds, state.selectedYaku, state.excludedYaku],
  );

  // 计算点数
  const result = useMemo(() => {
    if (!analysis?.isAgari || !state.winTile) return null;

    const input: WinHandInput = {
      handTiles: state.handTiles,
      openMentsu: state.openMentsu,
      winTile: state.winTile,
      winType: analysis.winType ?? state.winType,
      agariType: state.isTsumo ? 'tsumo' : 'ron',
      isMenzen: state.isMenzen,
      isTsumo: state.isTsumo,
      isDealer: state.isDealer,
      playerWind: state.playerWind,
      baWind: state.baWind,
      // 界面录入的是宝牌指示牌，这里换算成宝牌本身
      doraTiles: getDoraTilesFromIndicators(state.doraTiles),
      uraDoraTiles: state.isRiichi ? getDoraTilesFromIndicators(state.uraDoraTiles) : [],
      redDoraCount: state.redDoraCount,
      isRiichi: state.isRiichi,
      isDoubleRiichi: state.isDoubleRiichi,
      isIppatsu: state.isIppatsu,
      isLastTile: state.isLastTile,
      isLastDraw: state.isLastDraw,
      isFirstDraw: false,
      isTenhou: false,
      isChiihou: false,
      honba: state.honba,
      kyoutaku: state.kyoutaku,
      tenpaiType: analysis.tenpaiType,
      selectedYaku: effectiveYaku,
      isFuriten: false,
      janto: analysis.janto,
      mentsu: analysis.mentsu,
      isMenzenTsumo: state.isMenzen && state.isTsumo,
    };

    try {
      return calculatePoints(input);
    } catch {
      return null;
    }
  }, [analysis, effectiveYaku, state]);

  // 役种点击：自动判定出的役点击=排除，其余点击=手动加/减
  const toggleYaku = (yakuId: string) => {
    setState(prev => {
      if (prev.excludedYaku.includes(yakuId)) {
        return { ...prev, excludedYaku: prev.excludedYaku.filter(id => id !== yakuId) };
      }
      if (autoYakuIds.includes(yakuId)) {
        return { ...prev, excludedYaku: [...prev.excludedYaku, yakuId] };
      }
      return prev.selectedYaku.includes(yakuId)
        ? { ...prev, selectedYaku: prev.selectedYaku.filter(id => id !== yakuId) }
        : { ...prev, selectedYaku: [...prev.selectedYaku, yakuId] };
    });
  };

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0F1A15]/95 backdrop-blur-sm border-b border-[#26382C]">
        <div className="flex items-center px-4 py-3">
          <Link href="/" className="p-2 -ml-2 mr-2 text-[#9FAF9E] hover:text-[#EFE9DA] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-serif font-bold text-[#EFE9DA]">拍照算点</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {/* Photo Upload */}
        <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
          <h3 className="text-sm font-serif font-bold text-[#C9A24B] mb-3">牌面识别</h3>
          <div className="flex gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#C4463A] text-[#F6F1E4] rounded-lg text-sm font-medium btn-vermillion"
            >
              <Camera className="w-4 h-4" />
              拍照
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#26382C] text-[#EFE9DA] rounded-lg text-sm font-medium hover:bg-[#31473A] transition-colors"
            >
              <Upload className="w-4 h-4" />
              相册
            </button>
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
          />

          <div className="flex items-center justify-between gap-2 mt-3 text-[10px] text-[#9FAF9E]">
            <span className="truncate">识别模型：{aiLabel || '读取中…'}</span>
            <Link href="/settings" className="text-[#C9A24B] hover:underline shrink-0">
              配置 API
            </Link>
          </div>

          {imagePreview && (
            <div className="mt-3 relative">
              {/* 本地 dataURL 预览，next/image 优化无意义 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="牌面预览" className="w-full rounded-lg max-h-48 object-cover" />
              {isRecognizing && (
                <div className="absolute inset-0 bg-[#0F1A15]/80 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-[#C9A24B] animate-spin" />
                  <span className="ml-2 text-sm text-[#EFE9DA]">识别中...</span>
                </div>
              )}
            </div>
          )}
          {error && <p className="mt-2 text-xs text-[#C4463A]">{error}</p>}
        </section>

        {/* Manual Input */}
        <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
          <h3 className="text-sm font-serif font-bold text-[#C9A24B] mb-3">手牌编辑</h3>
          <div className="flex flex-wrap gap-1.5 min-h-[3.5rem] p-2 bg-[#0F1A15] rounded-lg mb-3">
            {state.handTiles.map((tile, i) => (
              <button
                key={tile.id || i}
                onClick={() => removeTile(i)}
                className="relative group"
              >
                <TileDisplay tile={tile} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C4463A] rounded-full text-[10px] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  ✕
                </span>
              </button>
            ))}
            <button
              onClick={() => { setPickerTarget('hand'); setShowTilePicker(true); }}
              className="w-10 h-13 flex items-center justify-center border border-dashed border-[#26382C] rounded-md text-[#9FAF9E] hover:border-[#C9A24B] hover:text-[#C9A24B] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Win tile */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-[#9FAF9E]">和了牌:</span>
            {state.winTile ? (
              <button onClick={() => { setPickerTarget('win'); setShowTilePicker(true); }}>
                <TileDisplay tile={state.winTile} />
              </button>
            ) : (
              <button
                onClick={() => { setPickerTarget('win'); setShowTilePicker(true); }}
                className="px-3 py-1 border border-dashed border-[#26382C] rounded text-xs text-[#9FAF9E] hover:border-[#C9A24B] hover:text-[#C9A24B]"
              >
                选择和了牌
              </button>
            )}
          </div>

          {/* Dora indicator tiles */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9FAF9E]">宝牌指示牌:</span>
            <div className="flex gap-1">
              {state.doraTiles.map((tile, i) => (
                <button key={i} onClick={() => setState(prev => ({ ...prev, doraTiles: prev.doraTiles.filter((_, j) => j !== i) }))}>
                  <TileDisplay tile={tile} small />
                </button>
              ))}
            </div>
            <button
              onClick={() => { setPickerTarget('dora'); setShowTilePicker(true); }}
              className="px-2 py-0.5 border border-dashed border-[#26382C] rounded text-xs text-[#9FAF9E] hover:border-[#C9A24B] hover:text-[#C9A24B]"
            >
              +
            </button>
          </div>
        </section>

        {/* Auto analysis */}
        <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
          <h3 className="text-sm font-serif font-bold text-[#C9A24B] mb-3 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            自动判定
          </h3>
          {analysis?.isAgari ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                <span className="text-[#9FAF9E]">
                  和牌形：
                  <span className="text-[#EFE9DA]">
                    {WIN_TYPE_LABELS[analysis.winType ?? 'normal']}
                  </span>
                </span>
                <span className="text-[#9FAF9E]">
                  听牌形：
                  <span className="text-[#EFE9DA]">{TENPAI_LABELS[analysis.tenpaiType]}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {effectiveYaku.length === 0 ? (
                  <span className="text-xs text-[#C4463A]">无役，不能和牌</span>
                ) : (
                  effectiveYaku.map(id => {
                    const yaku = YAKU_LIST.find(y => y.id === id);
                    if (!yaku) return null;
                    return (
                      <span
                        key={id}
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          yaku.isYakuman
                            ? 'bg-[#C9A24B] text-[#0F1A15]'
                            : 'bg-[#C4463A]/20 text-[#C4463A]'
                        }`}
                      >
                        {yaku.name}
                        {autoYakuIds.includes(id) && (
                          <span className="ml-1 opacity-70">自动</span>
                        )}
                      </span>
                    );
                  })
                )}
              </div>
              <p className="text-[10px] text-[#9FAF9E]">
                下方役种里高亮的即为自动判定结果，点击可取消；未高亮的可手动补选。
              </p>
            </div>
          ) : (
            <p className="text-xs text-[#9FAF9E]">
              {analysis?.message ??
                (state.handTiles.length === 0
                  ? '录入手牌后自动判定和牌形、听牌形与役种'
                  : `手牌 ${state.handTiles.length}/${expectedConcealed} 张`)}
            </p>
          )}
        </section>

        {/* Conditions */}
        <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
          <h3 className="text-sm font-serif font-bold text-[#C9A24B] mb-3">和牌条件</h3>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="和牌方式"
              value={state.isTsumo ? 'tsumo' : 'ron'}
              onChange={v => setState(prev => ({ ...prev, isTsumo: v === 'tsumo' }))}
              options={[{ value: 'ron', label: '荣和' }, { value: 'tsumo', label: '自摸' }]}
            />
            <SelectField
              label="庄闲"
              value={state.isDealer ? 'dealer' : 'non_dealer'}
              onChange={v => setState(prev => ({ ...prev, isDealer: v === 'dealer' }))}
              options={[{ value: 'non_dealer', label: '闲家' }, { value: 'dealer', label: '庄家' }]}
            />
            <SelectField
              label="自风"
              value={state.playerWind}
              onChange={v => setState(prev => ({ ...prev, playerWind: v as PlayerWind }))}
              options={[
                { value: 'east', label: '东' },
                { value: 'south', label: '南' },
                { value: 'west', label: '西' },
                { value: 'north', label: '北' },
              ]}
            />
            <SelectField
              label="场风"
              value={state.baWind}
              onChange={v => setState(prev => ({ ...prev, baWind: v as BaWind }))}
              options={[
                { value: 'east', label: '东' },
                { value: 'south', label: '南' },
              ]}
            />
            <SelectField
              label={analysis?.isAgari ? '听牌形（自动）' : '听牌形'}
              value={analysis?.isAgari ? analysis.tenpaiType : state.tenpaiType}
              onChange={v => setState(prev => ({ ...prev, tenpaiType: v as TenpaiType }))}
              options={[
                { value: 'ryanmen', label: '两面' },
                { value: 'kanchan', label: '嵌张' },
                { value: 'penchan', label: '边张' },
                { value: 'tanki', label: '单骑' },
                { value: 'shanpon', label: '双碰' },
              ]}
            />
            <SelectField
              label={analysis?.isAgari ? '和牌型（自动）' : '和牌型'}
              value={analysis?.isAgari && analysis.winType ? analysis.winType : state.winType}
              onChange={v => setState(prev => ({ ...prev, winType: v as WinType }))}
              options={[
                { value: 'normal', label: '一般型' },
                { value: 'chitoitsu', label: '七对子' },
                { value: 'kokushi', label: '国士' },
              ]}
            />
          </div>

          {/* Toggle options */}
          <div className="flex flex-wrap gap-2 mt-3">
            <ToggleChip label="门清" active={state.isMenzen} onChange={v => setState(prev => ({ ...prev, isMenzen: v }))} />
            <ToggleChip label="立直" active={state.isRiichi} onChange={v => setState(prev => ({ ...prev, isRiichi: v, isDoubleRiichi: false }))} />
            <ToggleChip label="双立直" active={state.isDoubleRiichi} onChange={v => setState(prev => ({ ...prev, isDoubleRiichi: v, isRiichi: v }))} />
            <ToggleChip label="一发" active={state.isIppatsu} onChange={v => setState(prev => ({ ...prev, isIppatsu: v }))} />
            <ToggleChip label="海底" active={state.isLastTile} onChange={v => setState(prev => ({ ...prev, isLastTile: v }))} />
          </div>

          {/* Honba & Kyoutaku */}
          <div className="flex gap-4 mt-3">
            <NumberField label="本场" value={state.honba} onChange={v => setState(prev => ({ ...prev, honba: v }))} />
            <NumberField label="供托" value={state.kyoutaku} onChange={v => setState(prev => ({ ...prev, kyoutaku: v }))} />
            <NumberField label="赤宝牌" value={state.redDoraCount} onChange={v => setState(prev => ({ ...prev, redDoraCount: v }))} />
          </div>
        </section>

        {/* Yaku Selection */}
        <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
          <h3 className="text-sm font-serif font-bold text-[#C9A24B] mb-3">役种选择</h3>
          <div className="flex flex-wrap gap-2">
            {YAKU_LIST.filter(y => !y.isYakuman).map(yaku => {
              const isAuto = autoYakuIds.includes(yaku.id);
              const canUse = isAuto || (state.isMenzen ? yaku.han > 0 : yaku.hanOpen > 0);
              const isSelected = effectiveYaku.includes(yaku.id);
              return (
                <button
                  key={yaku.id}
                  disabled={!canUse}
                  onClick={() => toggleYaku(yaku.id)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                    isSelected
                      ? 'bg-[#C4463A] text-[#F6F1E4]'
                      : canUse
                        ? 'bg-[#26382C] text-[#EFE9DA] hover:bg-[#31473A]'
                        : 'bg-[#17251D] text-[#55695B] cursor-not-allowed'
                  }`}
                >
                  {yaku.name}
                  {isAuto && <span className="ml-1 text-[9px] opacity-80">自动</span>}
                  <span className="ml-1 opacity-70">
                    {state.isMenzen ? yaku.han : yaku.hanOpen}番
                  </span>
                </button>
              );
            })}
          </div>

          {/* Yakuman */}
          <h4 className="text-xs font-medium text-[#C9A24B] mt-4 mb-2">役满</h4>
          <div className="flex flex-wrap gap-2">
            {YAKU_LIST.filter(y => y.isYakuman).map(yaku => {
              const isAuto = autoYakuIds.includes(yaku.id);
              const isSelected = effectiveYaku.includes(yaku.id);
              return (
                <button
                  key={yaku.id}
                  onClick={() => toggleYaku(yaku.id)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                    isSelected
                      ? 'bg-[#C9A24B] text-[#0F1A15]'
                      : 'bg-[#26382C] text-[#EFE9DA] hover:bg-[#31473A]'
                  }`}
                >
                  {yaku.name}
                  {isAuto && <span className="ml-1 text-[9px] opacity-80">自动</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Result */}
        {result && (
          <section className="bg-[#17251D] rounded-lg border border-[#C9A24B]/30 p-4">
            <h3 className="text-sm font-serif font-bold text-[#C9A24B] mb-3">计算结果</h3>

            {/* Yaku list */}
            <div className="space-y-1 mb-3">
              {result.yakuList.map(({ yaku, han }) => (
                <div key={yaku.id} className="flex justify-between text-xs">
                  <span className="text-[#EFE9DA]">{yaku.name}</span>
                  <span className="text-[#C9A24B]">{han}番</span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#26382C] pt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-[#9FAF9E]">翻数</span>
                <span className="text-sm font-bold text-[#EFE9DA]">{result.totalHan}翻</span>
              </div>
              {!result.isYakuman && (
                <div className="flex justify-between">
                  <span className="text-xs text-[#9FAF9E]">符数</span>
                  <span className="text-sm font-bold text-[#EFE9DA]">{result.fu}符</span>
                </div>
              )}
              {result.doraCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-[#9FAF9E]">宝牌</span>
                  <span className="text-sm text-[#C9A24B]">+{result.doraCount}番</span>
                </div>
              )}
              {result.limitType !== 'none' && (
                <div className="flex justify-between">
                  <span className="text-xs text-[#9FAF9E]">级别</span>
                  <span className={`text-sm font-bold ${result.isYakuman ? 'text-[#C9A24B]' : 'text-[#C4463A]'}`}>
                    {getLimitTypeName(result.limitType)}
                  </span>
                </div>
              )}
            </div>

            {/* Points */}
            {result.hasYaku ? (
              <div className="mt-3 p-3 bg-[#0F1A15] rounded-lg">
                <p className="text-xs text-[#9FAF9E] mb-1">支付点数</p>
                {state.isTsumo ? (
                  state.isDealer ? (
                    <p className="text-lg font-bold text-[#C9A24B]">
                      {result.points.dealer_tsumo}点 × 3人
                    </p>
                  ) : (
                    <p className="text-lg font-bold text-[#C9A24B]">
                      {result.points.non_dealer_tsumo_non_dealer} / {result.points.non_dealer_tsumo_dealer}
                      <span className="text-xs text-[#9FAF9E] ml-1">(闲家/庄家)</span>
                    </p>
                  )
                ) : (
                  <p className="text-lg font-bold text-[#C9A24B]">
                    {state.isDealer ? result.points.dealer_ron : result.points.non_dealer_ron}点
                  </p>
                )}
                {state.honba > 0 && (
                  <p className="text-xs text-[#9FAF9E] mt-1">
                    + 本场 {state.honba * 300}点
                  </p>
                )}
                {state.kyoutaku > 0 && (
                  <p className="text-xs text-[#9FAF9E]">
                    + 供托 {state.kyoutaku * 1000}点
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-3 p-3 bg-[#C4463A]/10 border border-[#C4463A]/30 rounded-lg">
                <p className="text-xs text-[#C4463A]">
                  无役不能和牌。宝牌只加番、不构成役，请核对役种选择。
                </p>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Tile Picker Modal */}
      {showTilePicker && (
        <TilePicker
          onSelect={addTile}
          onClose={() => setShowTilePicker(false)}
        />
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs text-[#9FAF9E] mb-1 block">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0F1A15] border border-[#26382C] rounded-md px-2 py-1.5 text-xs text-[#EFE9DA] focus:outline-none focus:border-[#C9A24B]/50"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleChip({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`px-3 py-1 rounded-full text-xs transition-all ${
        active
          ? 'bg-[#C4463A] text-[#F6F1E4]'
          : 'bg-[#26382C] text-[#9FAF9E] hover:text-[#EFE9DA]'
      }`}
    >
      {label}
    </button>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-[#9FAF9E] mr-1">{label}</span>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-6 h-6 flex items-center justify-center bg-[#26382C] rounded text-[#EFE9DA] hover:bg-[#31473A]"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-6 text-center text-xs text-[#EFE9DA] font-medium">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-6 h-6 flex items-center justify-center bg-[#26382C] rounded text-[#EFE9DA] hover:bg-[#31473A]"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}
