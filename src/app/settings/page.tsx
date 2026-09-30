'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  PlugZap,
  Save,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_MAX_TOKENS,
  MAX_MAX_TOKENS,
  MIN_MAX_TOKENS,
  PROVIDER_PRESETS,
  describeRequestTarget,
  findPreset,
  resolveProvider,
  validateProvider,
  type ProviderConfigInput,
} from '@/lib/ai/providers';
import { Switch } from '@/components/ui/switch';
import {
  DEFAULT_AI_SETTINGS,
  getActiveProviderConfig,
  isProviderConfigured,
  loadAiSettings,
  removeProviderConfig,
  saveAiSettings,
  upsertProviderConfig,
  type AiSettings,
} from '@/lib/ai/storage';

interface Draft {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  thinking: boolean;
}

interface TestResult {
  ok: boolean;
  message: string;
  detail?: string;
}

/** 表单初值：只取自用户已保存的配置，不用预设值兜底 */
function draftFrom(config: ProviderConfigInput | undefined): Draft {
  return {
    baseUrl: config?.baseUrl ?? '',
    apiKey: config?.apiKey ?? '',
    model: config?.model ?? '',
    temperature: config?.temperature ?? 0.2,
    maxTokens: config?.maxTokens ?? DEFAULT_MAX_TOKENS,
    thinking: config?.thinking ?? false,
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [selectedId, setSelectedId] = useState('coze');
  const [draft, setDraft] = useState<Draft>(() =>
    draftFrom(undefined),
  );
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadAiSettings();
    setSettings(stored);
    setSelectedId(stored.activeProviderId);
  }, []);

  const preset = useMemo(() => findPreset(selectedId) ?? PROVIDER_PRESETS[0], [selectedId]);

  // 切换厂商时，用已保存配置或预设默认值填充表单
  useEffect(() => {
    setDraft(draftFrom(settings.configs[selectedId]));
    setTestResult(null);
    setNotice(null);
    setShowKey(false);
  }, [selectedId, settings.configs, preset]);

  const resolved = useMemo(
    () => resolveProvider({ providerId: selectedId, ...draft }),
    [selectedId, draft],
  );
  const problems = useMemo(() => validateProvider(resolved), [resolved]);

  const persist = useCallback(
    (next: AiSettings, message: string) => {
      const ok = saveAiSettings(next);
      setSettings(next);
      setNotice(ok ? message : '保存失败：浏览器存储不可用（可能是隐私模式）');
    },
    [],
  );

  const handleSave = (activate: boolean) => {
    if (problems.length > 0) {
      setNotice(`无法保存：${problems.join('、')}`);
      return;
    }
    const next = upsertProviderConfig(settings, selectedId, draft);
    persist(activate ? { ...next, activeProviderId: selectedId } : next, activate ? '已保存并启用' : '已保存');
  };

  const handleDelete = () => {
    persist(removeProviderConfig(settings, selectedId), '已清除该厂商配置');
    setDraft(draftFrom(undefined));
  };

  const handleTest = async () => {
    if (problems.length > 0) {
      setTestResult({ ok: false, message: `配置不完整：${problems.join('、')}` });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: { providerId: selectedId, ...draft }, vision: true }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({
          ok: true,
          message: `连通正常 · ${data.model}`,
          detail: `耗时 ${data.latencyMs}ms · 模型回复：${data.reply}`,
        });
      } else {
        setTestResult({ ok: false, message: data.error || '测试失败' });
      }
    } catch {
      setTestResult({ ok: false, message: '请求发送失败，请检查网络' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <header className="sticky top-0 z-50 bg-[#0F1A15]/95 backdrop-blur-sm border-b border-[#26382C]">
        <div className="flex items-center px-4 py-3">
          <Link href="/" className="p-2 -ml-2 mr-2 text-[#9FAF9E] hover:text-[#EFE9DA] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-serif font-bold text-[#EFE9DA]">API 配置</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {/* 安全提示 */}
        <section className="bg-[#C4463A]/10 border border-[#C4463A]/30 rounded-lg p-4">
          <h2 className="text-sm font-medium text-[#C4463A] mb-1 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            关于密钥安全
          </h2>
          <p className="text-xs text-[#9FAF9E] leading-relaxed">
            API Key 只保存在本机浏览器（localStorage），不会被上传到本项目的服务器留存；
            识别时会随请求转发给您自己配置的厂商。请勿在公共设备上保存 Key。
          </p>
        </section>

        {/* 厂商选择 */}
        <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
          <h2 className="text-sm font-serif font-bold text-[#C9A24B] mb-3">选择厂商</h2>
          <div className="space-y-2">
            {PROVIDER_PRESETS.map(item => {
              const isSelected = item.id === selectedId;
              const isActive = item.id === settings.activeProviderId;
              const configured = isProviderConfigured(settings, item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md border transition-all ${
                    isSelected
                      ? 'border-[#C9A24B] bg-[#C9A24B]/10'
                      : 'border-[#26382C] bg-[#0F1A15] hover:border-[#31473A]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#EFE9DA] truncate">{item.name}</span>
                        {!item.supportsVision && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C4463A]/20 text-[#C4463A] shrink-0">
                            无图片
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C9A24B] text-[#0F1A15] shrink-0">
                            使用中
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#9FAF9E] mt-1 truncate">
                        {item.vendor}
                        {configured ? ' · 已配置' : ''}
                      </p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#C9A24B] shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 配置表单 */}
        <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-serif font-bold text-[#C9A24B]">{preset.name}</h2>
            {preset.apiKeyUrl && (
              <a
                href={preset.apiKeyUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#9FAF9E] hover:text-[#C9A24B] flex items-center gap-1"
              >
                获取 Key
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {preset.note && (
            <p className="text-[10px] text-[#9FAF9E] leading-relaxed bg-[#0F1A15] rounded p-2">
              {preset.note}
            </p>
          )}

          {preset.kind !== 'coze' && (
            <>
              <Field label="Base URL">
                <input
                  type="text"
                  value={draft.baseUrl}
                  onChange={e => setDraft(prev => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder={preset.exampleBaseUrl || 'https://your-gateway/v1'}
                  className="w-full bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2 text-sm text-[#EFE9DA] placeholder-[#55695B] focus:outline-none focus:border-[#C9A24B]/60"
                />
                <p className="text-[10px] text-[#55695B] mt-1 break-all">
                  实际请求地址：{describeRequestTarget(resolved)}
                </p>
              </Field>

              <Field label="API Key">
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={draft.apiKey}
                    onChange={e => setDraft(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="sk-..."
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full bg-[#0F1A15] border border-[#26382C] rounded-md pl-3 pr-10 py-2 text-sm text-[#EFE9DA] placeholder-[#55695B] focus:outline-none focus:border-[#C9A24B]/60"
                  />
                  <button
                    type="button"
                    aria-label={showKey ? '隐藏密钥' : '显示密钥'}
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#9FAF9E] hover:text-[#EFE9DA]"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
            </>
          )}

          <Field label="模型">
            <input
              type="text"
              list={`models-${preset.id}`}
              value={draft.model}
              onChange={e => setDraft(prev => ({ ...prev, model: e.target.value }))}
              placeholder={preset.exampleModel || 'model-name'}
              spellCheck={false}
              className="w-full bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2 text-sm text-[#EFE9DA] placeholder-[#55695B] focus:outline-none focus:border-[#C9A24B]/60"
            />
            <datalist id={`models-${preset.id}`}>
              {preset.suggestedModels.map(model => (
                <option key={model} value={model} />
              ))}
            </datalist>
            {preset.suggestedModels.length > 0 && (
              <>
                <p className="text-[10px] text-[#55695B] mt-2">
                  常用型号（点击填入，具体请以厂商控制台为准）
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {preset.suggestedModels.map(model => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, model }))}
                      className={`px-2 py-1 rounded text-[10px] transition-colors ${
                        draft.model === model
                          ? 'bg-[#C4463A] text-[#F6F1E4]'
                          : 'bg-[#26382C] text-[#9FAF9E] hover:text-[#EFE9DA]'
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </>
            )}
          </Field>

          <Field label={`温度 ${draft.temperature.toFixed(1)}`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={draft.temperature}
              onChange={e => setDraft(prev => ({ ...prev, temperature: Number(e.target.value) }))}
              className="w-full accent-[#C9A24B]"
            />
          </Field>

          <Field label="思考">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] text-[#55695B] leading-relaxed">
                开启后模型会先做推理再回答。推理 token 与「输出 token 限额」共享额度，
                推理模型（如 deepseek-flash）开着容易把预算用光导致正文为空，建议保持关闭。
              </p>
              <Switch
                checked={draft.thinking}
                onCheckedChange={value => setDraft(prev => ({ ...prev, thinking: value }))}
                aria-label="思考开关"
              />
            </div>
          </Field>

          <Field label="输出 token 限额">
            <input
              type="number"
              min={MIN_MAX_TOKENS}
              max={MAX_MAX_TOKENS}
              step={256}
              value={draft.maxTokens}
              onChange={e => setDraft(prev => ({ ...prev, maxTokens: Number(e.target.value) }))}
              className="w-full bg-[#0F1A15] border border-[#26382C] rounded-md px-3 py-2 text-sm text-[#EFE9DA] placeholder-[#55695B] focus:outline-none focus:border-[#C9A24B]/60"
            />
            <p className="text-[10px] text-[#55695B] mt-1">
              请求里的 max_tokens（思考与正文共享）。默认 {DEFAULT_MAX_TOKENS}，范围{' '}
              {MIN_MAX_TOKENS}~{MAX_MAX_TOKENS}，实际生效 {resolved.maxTokens}。
            </p>
          </Field>

          {problems.length > 0 && (
            <p className="text-xs text-[#C4463A]">还缺：{problems.join('、')}</p>
          )}
          {notice && <p className="text-xs text-[#C9A24B]">{notice}</p>}

          {testResult && (
            <div
              className={`rounded-md p-2.5 border text-xs ${
                testResult.ok
                  ? 'bg-[#5B8C5A]/10 border-[#5B8C5A]/30 text-[#5B8C5A]'
                  : 'bg-[#C4463A]/10 border-[#C4463A]/30 text-[#C4463A]'
              }`}
            >
              <p>{testResult.message}</p>
              {testResult.detail && <p className="mt-1 opacity-80">{testResult.detail}</p>}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex-1 min-w-[7rem] flex items-center justify-center gap-1.5 py-2 bg-[#26382C] text-[#EFE9DA] rounded-md text-xs font-medium hover:bg-[#31473A] disabled:opacity-50 transition-colors"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlugZap className="w-3.5 h-3.5" />}
              {testing ? '测试中…' : '测试连接'}
            </button>
            <button
              onClick={() => handleSave(false)}
              className="flex-1 min-w-[7rem] flex items-center justify-center gap-1.5 py-2 bg-[#26382C] text-[#EFE9DA] rounded-md text-xs font-medium hover:bg-[#31473A] transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              仅保存
            </button>
            <button
              onClick={() => handleSave(true)}
              className="flex-1 min-w-[7rem] flex items-center justify-center gap-1.5 py-2 bg-[#C4463A] text-[#F6F1E4] rounded-md text-xs font-medium btn-vermillion"
            >
              <Check className="w-3.5 h-3.5" />
              保存并启用
            </button>
            {isProviderConfigured(settings, selectedId) && (
              <button
                onClick={handleDelete}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-[#9FAF9E] hover:text-[#C4463A] rounded-md text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                清除
              </button>
            )}
          </div>
        </section>

        {/* 当前生效 */}
        <section className="bg-[#17251D] rounded-lg border border-[#26382C] p-4">
          <h2 className="text-sm font-serif font-bold text-[#C9A24B] mb-2">当前生效</h2>
          <CurrentSummary settings={settings} />
          <p className="text-[10px] text-[#9FAF9E] mt-2 leading-relaxed">
            未配置任何厂商时，拍照算点会自动回退到「平台内置（扣子）」。
          </p>
        </section>
      </main>
    </div>
  );
}

function CurrentSummary({ settings }: { settings: AiSettings }) {
  const config = getActiveProviderConfig(settings);
  const resolved = resolveProvider(config);
  const problems = validateProvider(resolved);

  return (
    <div className="text-xs space-y-1">
      <div className="flex justify-between gap-4">
        <span className="text-[#9FAF9E]">厂商</span>
        <span className="text-[#EFE9DA] text-right">{resolved.name}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[#9FAF9E]">模型</span>
        <span className="text-[#EFE9DA] text-right break-all">{resolved.model || '—'}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[#9FAF9E]">输出 token 限额</span>
        <span className="text-[#EFE9DA] text-right">{resolved.maxTokens}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[#9FAF9E]">思考</span>
        <span className="text-[#EFE9DA] text-right">{resolved.thinking ? '开启' : '关闭'}</span>
      </div>
      {resolved.baseUrl && (
        <div className="flex justify-between gap-4">
          <span className="text-[#9FAF9E]">Base URL</span>
          <span className="text-[#EFE9DA] text-right break-all">{resolved.baseUrl}</span>
        </div>
      )}
      {problems.length > 0 && <p className="text-[#C4463A]">配置不完整：{problems.join('、')}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-[#9FAF9E] mb-1 block">{label}</label>
      {children}
    </div>
  );
}
