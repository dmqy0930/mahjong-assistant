/**
 * 多厂商 LLM 接入：预设、配置解析、请求构造与响应解析。
 * 本文件必须保持「纯函数 + 无副作用」，既能在浏览器里用，也能在服务端用。
 */

export type ProviderKind = 'coze' | 'openai-compatible' | 'anthropic' | 'gemini';

export interface ProviderPreset {
  id: string;
  name: string;
  vendor: string;
  kind: ProviderKind;
  /** 仅供输入框占位提示，绝不作为默认值自动填入 */
  exampleBaseUrl: string;
  /** 仅供输入框占位提示，绝不作为默认值自动填入 */
  exampleModel: string;
  /** 常用型号建议，由用户点击才会写入表单 */
  suggestedModels: string[];
  supportsVision: boolean;
  requiresApiKey: boolean;
  apiKeyUrl?: string;
  note?: string;
}

/** 输出 token 上限（max_tokens）默认值与边界；推理模型的思考与正文共享此额度 */
export const DEFAULT_MAX_TOKENS = 8192;
export const MIN_MAX_TOKENS = 256;
export const MAX_MAX_TOKENS = 65536;

/** 自定义网关兜底预设 */
export const CUSTOM_PRESET: ProviderPreset = {
  id: 'custom',
  name: '自定义（OpenAI 兼容）',
  vendor: 'Self-hosted',
  kind: 'openai-compatible',
  exampleBaseUrl: '',
  exampleModel: '',
  suggestedModels: [],
  supportsVision: true,
  requiresApiKey: true,
  note: '任何兼容 OpenAI /chat/completions 协议的服务，例如 vLLM、Ollama、One-API、New-API。',
};

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'coze',
    name: '平台内置（扣子）',
    vendor: 'Coze',
    kind: 'coze',
    exampleBaseUrl: '',
    exampleModel: 'doubao-seed-2-0-pro-260215',
    suggestedModels: ['doubao-seed-2-0-pro-260215'],
    supportsVision: true,
    requiresApiKey: false,
    note: '部署在扣子编程内时使用项目运行时身份鉴权，无需填写 Key；本地/自建部署需配置 COZE_API_TOKEN 环境变量。',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    vendor: 'OpenAI',
    kind: 'openai-compatible',
    exampleBaseUrl: 'https://api.openai.com/v1',
    exampleModel: 'gpt-4o-mini',
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
    supportsVision: true,
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    vendor: 'Anthropic',
    kind: 'anthropic',
    exampleBaseUrl: 'https://api.anthropic.com',
    exampleModel: 'claude-3-5-sonnet-latest',
    suggestedModels: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-7-sonnet-latest'],
    supportsVision: true,
    requiresApiKey: true,
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    vendor: 'Google',
    kind: 'gemini',
    exampleBaseUrl: 'https://generativelanguage.googleapis.com',
    exampleModel: 'gemini-2.0-flash',
    suggestedModels: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    supportsVision: true,
    requiresApiKey: true,
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    note: 'Gemini 的 Key 通过 URL 参数传递（官方协议如此），请勿在公共网络抓包环境中使用。',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    vendor: '深度求索',
    kind: 'openai-compatible',
    // 官方文档（OpenAI 兼容）给的 base_url 就是不带版本的根地址
    exampleBaseUrl: 'https://api.deepseek.com',
    exampleModel: 'deepseek-flash',
    suggestedModels: ['deepseek-flash'],
    supportsVision: true,
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    note: 'deepseek-flash 支持图片输入（JPEG/PNG/GIF/WebP）。同厂的 deepseek-v4-pro 为纯文本模型、不接受图片，如需使用请手动填写模型名。该模型为推理模型，默认关闭「思考」，否则推理会占满输出预算导致正文为空。',
  },
  {
    id: 'moonshot',
    name: '月之暗面 Kimi',
    vendor: 'Moonshot AI',
    kind: 'openai-compatible',
    exampleBaseUrl: 'https://api.moonshot.cn/v1',
    exampleModel: 'moonshot-v1-8k-vision-preview',
    suggestedModels: ['moonshot-v1-8k-vision-preview', 'moonshot-v1-32k-vision-preview', 'kimi-latest'],
    supportsVision: true,
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    vendor: '智谱 AI',
    kind: 'openai-compatible',
    exampleBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    exampleModel: 'glm-4v-plus',
    suggestedModels: ['glm-4v-plus', 'glm-4v-flash', 'glm-4v'],
    supportsVision: true,
    requiresApiKey: true,
    apiKeyUrl: 'https://bigmodel.cn/usercenter/apikeys',
  },
  {
    id: 'qwen',
    name: '通义千问 Qwen-VL',
    vendor: '阿里云百炼',
    kind: 'openai-compatible',
    exampleBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    exampleModel: 'qwen-vl-max',
    suggestedModels: ['qwen-vl-max', 'qwen-vl-plus', 'qwen2.5-vl-72b-instruct'],
    supportsVision: true,
    requiresApiKey: true,
    apiKeyUrl: 'https://bailian.console.aliyun.com/',
  },
  CUSTOM_PRESET,
];

export function findPreset(providerId: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find(p => p.id === providerId);
}

/** 界面/存储里保存的原始配置 */
export interface ProviderConfigInput {
  providerId: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  /** 输出 token 上限，对应请求里的 max_tokens；缺省用 DEFAULT_MAX_TOKENS */
  maxTokens?: number;
  /** 是否允许模型先做思考（reasoning）。默认关闭，避免思考占满输出预算 */
  thinking?: boolean;
}

/** 补齐默认值后的可用配置 */
export interface ResolvedProvider {
  providerId: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  thinking: boolean;
  supportsVision: boolean;
}

export function resolveProvider(input: ProviderConfigInput): ResolvedProvider {
  const preset = findPreset(input.providerId) ?? CUSTOM_PRESET;
  return {
    providerId: preset.id,
    name: preset.name,
    kind: preset.kind,
    // 全部取自用户填写，不用预设兜底——否则预设过时会把用户的配置悄悄改掉
    baseUrl: (input.baseUrl ?? '').trim(),
    apiKey: (input.apiKey ?? '').trim(),
    model: (input.model ?? '').trim(),
    temperature: clampTemperature(input.temperature),
    maxTokens: clampMaxTokens(input.maxTokens),
    thinking: input.thinking === true,
    supportsVision: preset.supportsVision,
  };
}

export function clampTemperature(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.2;
  return Math.min(2, Math.max(0, value));
}

/** 输出 token 上限：非法值回落到默认，越界收敛到边界 */
export function clampMaxTokens(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_MAX_TOKENS;
  return Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, Math.round(value)));
}

/** 配置是否可用于发起请求（返回缺失项列表，空数组表示可保存） */
export function validateProvider(provider: ResolvedProvider): string[] {
  const problems: string[] = [];
  const preset = findPreset(provider.providerId);

  if (provider.kind !== 'coze') {
    if (!provider.baseUrl) problems.push('缺少 Base URL');
    if (preset?.requiresApiKey !== false && !provider.apiKey) problems.push('缺少 API Key');
  }
  if (!provider.model) problems.push('缺少模型名');
  return problems;
}

/**
 * 需要补 /v1 的主机白名单。
 * 只有这些服务把接口挂在 /v1 根路径下；其余服务一律按用户填写的原样使用，
 * 避免"贴心补全"把正确的地址改错（例如 DeepSeek 的接口就在根路径下）。
 */
const V1_HOSTS = new Set(['api.openai.com']);

/** 只有域名、且属于已知需要 /v1 的服务时才补上 */
export function normalizeOpenAIBase(baseUrl: string): string {
  let base = baseUrl.trim().replace(/\/+$/, '');
  if (!base) return base;
  if (/\/chat\/completions$/.test(base)) {
    base = base.replace(/\/chat\/completions$/, '');
  }
  if (hasNoPath(base) && V1_HOSTS.has(hostOf(base))) return `${base}/v1`;
  return base;
}

function hostOf(base: string): string {
  try {
    return new URL(base).host;
  } catch {
    return '';
  }
}

function hasNoPath(base: string): boolean {
  try {
    const url = new URL(base);
    return url.pathname === '' || url.pathname === '/';
  } catch {
    return false;
  }
}

export function buildOpenAIEndpoint(baseUrl: string): string {
  return `${normalizeOpenAIBase(baseUrl)}/chat/completions`;
}

export function buildAnthropicEndpoint(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  if (!base) return '';
  if (/\/messages$/.test(base)) return base;
  if (/\/v\d+$/.test(base)) return `${base}/messages`;
  if (hasNoPath(base)) return `${base}/v1/messages`;
  return `${base}/messages`;
}

export function buildGeminiEndpoint(baseUrl: string, model: string, apiKey: string): string {
  const base = (baseUrl.trim() || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
  const root = /\/v\d+(beta)?$/.test(base) ? base : `${base}/v1beta`;
  return `${root}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

/**
 * 描述这次请求真正会打到的地址，用于界面展示与报错诊断。
 * Gemini 的密钥在 query 里，这里始终用占位符替换，避免泄漏。
 */
export function describeRequestTarget(provider: ResolvedProvider): string {
  if (provider.kind === 'coze') return '平台内置（扣子）';
  if (!provider.baseUrl) return '（尚未填写 Base URL）';
  if (provider.kind === 'anthropic') return buildAnthropicEndpoint(provider.baseUrl);
  if (provider.kind === 'gemini') {
    return buildGeminiEndpoint(provider.baseUrl, provider.model || '{模型}', '***');
  }
  return buildOpenAIEndpoint(provider.baseUrl);
}

/** 拆解 dataURL，得到 MIME 类型与纯 base64 */
export function parseDataUrl(dataUrl: string): { mediaType: string; data: string } {
  const matched = /^data:([^;,]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (matched) return { mediaType: matched[1], data: matched[2] };
  return { mediaType: 'image/jpeg', data: dataUrl };
}

export interface ChatContent {
  systemPrompt: string;
  userText: string;
  imageDataUrl?: string;
  maxTokens: number;
  temperature: number;
  /** 是否允许思考；缺省视为关闭 */
  thinking?: boolean;
}

export function buildOpenAIBody(model: string, content: ChatContent): unknown {
  const userContent = content.imageDataUrl
    ? [
        { type: 'text', text: content.userText },
        { type: 'image_url', image_url: { url: content.imageDataUrl } },
      ]
    : content.userText;

  return {
    model,
    temperature: content.temperature,
    max_tokens: content.maxTokens,
    // 推理模型会先用 reasoning tokens 思考，且与 max_tokens 共享额度；
    // 这里始终显式声明，默认关闭思考，避免"思考吃满预算、正文为空"。
    // 不认识该字段的网关按 OpenAI 协议通常会忽略它。
    thinking: { type: content.thinking ? 'enabled' : 'disabled' },
    messages: [
      { role: 'system', content: content.systemPrompt },
      { role: 'user', content: userContent },
    ],
  };
}

export function buildAnthropicBody(model: string, content: ChatContent): unknown {
  const parts: unknown[] = [{ type: 'text', text: content.userText }];
  if (content.imageDataUrl) {
    const { mediaType, data } = parseDataUrl(content.imageDataUrl);
    parts.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } });
  }

  return {
    model,
    max_tokens: content.maxTokens,
    temperature: content.temperature,
    system: content.systemPrompt,
    messages: [{ role: 'user', content: parts }],
  };
}

export function buildGeminiBody(content: ChatContent): unknown {
  const parts: unknown[] = [{ text: `${content.systemPrompt}\n\n${content.userText}` }];
  if (content.imageDataUrl) {
    const { mediaType, data } = parseDataUrl(content.imageDataUrl);
    parts.push({ inline_data: { mime_type: mediaType, data } });
  }

  return {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: content.temperature,
      maxOutputTokens: content.maxTokens,
    },
  };
}

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | undefined {
  return typeof value === 'object' && value !== null ? (value as Json) : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** 从各厂商响应里取出助手文本 */
export function extractAssistantText(kind: ProviderKind, payload: unknown): string {
  const root = asRecord(payload);
  if (!root) return '';

  if (kind === 'anthropic') {
    return asArray(root.content)
      .map(block => asString(asRecord(block)?.text))
      .join('');
  }

  if (kind === 'gemini') {
    const candidate = asRecord(asArray(root.candidates)[0]);
    const content = asRecord(candidate?.content);
    return asArray(content?.parts)
      .map(part => asString(asRecord(part)?.text))
      .join('');
  }

  const choice = asRecord(asArray(root.choices)[0]);
  const message = asRecord(choice?.message);
  const content = message?.content;
  if (typeof content === 'string') return content;
  return asArray(content)
    .map(part => (typeof part === 'string' ? part : asString(asRecord(part)?.text)))
    .join('');
}

/** 从错误响应里提取可读信息（不含密钥） */
export function extractErrorMessage(payload: unknown, fallback: string): string {
  const root = asRecord(payload);
  if (!root) return fallback;

  const error = asRecord(root.error);
  const message =
    asString(error?.message) || asString(root.message) || asString(root.msg) || asString(root.detail);
  return message || fallback;
}

/** 结束原因：兼容 OpenAI(finish_reason) / Anthropic(stop_reason) / Gemini(finishReason) */
export function extractFinishReason(payload: unknown): string {
  const root = asRecord(payload);
  if (!root) return '';
  return (
    asString(asRecord(asArray(root.choices)[0])?.finish_reason) ||
    asString(root.stop_reason) ||
    asString(asRecord(asArray(root.candidates)[0])?.finishReason)
  );
}

/** 推理消耗的 token 数；各厂商字段位置不一，逐处兜底 */
export function extractReasoningTokens(payload: unknown): number {
  const usage = asRecord(asRecord(payload)?.usage);
  if (!usage) return 0;
  const candidates = [
    asRecord(usage.completion_tokens_details)?.reasoning_tokens,
    asRecord(usage.output_tokens_details)?.reasoning_tokens,
    usage.reasoning_tokens,
  ];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

const TRUNCATED_REASONS = new Set(['length', 'max_tokens', 'MAX_TOKENS']);
const FILTERED_REASONS = new Set([
  'content_filter',
  'refusal',
  'SAFETY',
  'PROHIBITED_CONTENT',
  'RECITATION',
]);

/**
 * 响应没有正文时，依据 finish_reason 与推理 token 用量给出真实原因，
 * 而不是一律甩锅给"模型不支持图片"。
 */
export function describeEmptyContent(payload: unknown, model: string): string {
  const reasoningTokens = extractReasoningTokens(payload);
  const finishReason = extractFinishReason(payload);
  const truncated = TRUNCATED_REASONS.has(finishReason);

  if (reasoningTokens > 0 && truncated) {
    return `模型先用 ${reasoningTokens} 个推理 token 把输出预算占满，没留出正文。请在「API 配置」中关闭「思考」或提高「输出 token 限额」`;
  }
  if (reasoningTokens > 0) {
    return `模型消耗了 ${reasoningTokens} 个推理 token 后仍未输出正文，请在「API 配置」中关闭「思考」或提高「输出 token 限额」`;
  }
  if (truncated) {
    return `输出被 token 限额截断（${finishReason}）且没有正文，请在「API 配置」中提高「输出 token 限额」`;
  }
  if (FILTERED_REASONS.has(finishReason)) {
    return `厂商的安全策略拦截了本次输出（${finishReason}），请更换图片或模型`;
  }
  return `请确认所选模型支持图片输入（当前模型：${model}）`;
}
