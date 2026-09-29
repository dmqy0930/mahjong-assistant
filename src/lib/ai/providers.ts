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
  defaultBaseUrl: string;
  defaultModel: string;
  models: string[];
  supportsVision: boolean;
  requiresApiKey: boolean;
  apiKeyUrl?: string;
  note?: string;
}

/** 自定义网关兜底预设 */
export const CUSTOM_PRESET: ProviderPreset = {
  id: 'custom',
  name: '自定义（OpenAI 兼容）',
  vendor: 'Self-hosted',
  kind: 'openai-compatible',
  defaultBaseUrl: '',
  defaultModel: '',
  models: [],
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
    defaultBaseUrl: '',
    defaultModel: 'doubao-seed-2-0-pro-260215',
    models: ['doubao-seed-2-0-pro-260215'],
    supportsVision: true,
    requiresApiKey: false,
    note: '部署在扣子编程内时使用项目运行时身份鉴权，无需填写 Key；本地/自建部署需配置 COZE_API_TOKEN 环境变量。',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    vendor: 'OpenAI',
    kind: 'openai-compatible',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
    supportsVision: true,
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    vendor: 'Anthropic',
    kind: 'anthropic',
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-sonnet-latest',
    models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-7-sonnet-latest'],
    supportsVision: true,
    requiresApiKey: true,
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    vendor: 'Google',
    kind: 'gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
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
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-flash',
    models: ['deepseek-flash'],
    supportsVision: true,
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    note: 'deepseek-flash 支持图片输入（JPEG/PNG/GIF/WebP）。同厂的 deepseek-v4-pro 为纯文本模型、不接受图片，如需使用请手动填写模型名。',
  },
  {
    id: 'moonshot',
    name: '月之暗面 Kimi',
    vendor: 'Moonshot AI',
    kind: 'openai-compatible',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k-vision-preview',
    models: ['moonshot-v1-8k-vision-preview', 'moonshot-v1-32k-vision-preview', 'kimi-latest'],
    supportsVision: true,
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    vendor: '智谱 AI',
    kind: 'openai-compatible',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4v-plus',
    models: ['glm-4v-plus', 'glm-4v-flash', 'glm-4v'],
    supportsVision: true,
    requiresApiKey: true,
    apiKeyUrl: 'https://bigmodel.cn/usercenter/apikeys',
  },
  {
    id: 'qwen',
    name: '通义千问 Qwen-VL',
    vendor: '阿里云百炼',
    kind: 'openai-compatible',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-vl-max',
    models: ['qwen-vl-max', 'qwen-vl-plus', 'qwen2.5-vl-72b-instruct'],
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
  supportsVision: boolean;
}

export function resolveProvider(input: ProviderConfigInput): ResolvedProvider {
  const preset = findPreset(input.providerId) ?? CUSTOM_PRESET;
  const apiKey = (input.apiKey ?? '').trim();
  return {
    providerId: preset.id,
    name: preset.name,
    kind: preset.kind,
    baseUrl: (input.baseUrl ?? preset.defaultBaseUrl).trim() || preset.defaultBaseUrl,
    apiKey,
    model: (input.model ?? '').trim() || preset.defaultModel,
    temperature: clampTemperature(input.temperature),
    supportsVision: preset.supportsVision,
  };
}

export function clampTemperature(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.2;
  return Math.min(2, Math.max(0, value));
}

/** 配置是否可用于发起请求（返回缺失项列表，空数组表示可保存） */
export function validateProvider(provider: ResolvedProvider): string[] {
  const problems: string[] = [];
  const preset = findPreset(provider.providerId);

  if (provider.kind !== 'coze') {
    if (!provider.baseUrl) problems.push('缺少 Base URL');
    if (preset?.requiresApiKey !== false && !provider.apiKey) problems.push('缺少 API Key');
    if (!provider.model) problems.push('缺少模型名');
  }
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
