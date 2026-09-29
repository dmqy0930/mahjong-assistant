import { Config, LLMClient } from 'coze-coding-dev-sdk';
import {
  buildAnthropicBody,
  buildAnthropicEndpoint,
  buildGeminiBody,
  buildGeminiEndpoint,
  buildOpenAIBody,
  buildOpenAIEndpoint,
  describeEmptyContent,
  extractAssistantText,
  extractErrorMessage,
  type ChatContent,
  type ResolvedProvider,
} from './providers';

const REQUEST_TIMEOUT_MS = 60_000;

export class ProviderError extends Error {
  readonly status: number;
  readonly providerId: string;
  readonly model: string;

  constructor(message: string, status: number, providerId: string, model = '') {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.providerId = providerId;
    this.model = model;
  }
}

export interface RunChatInput {
  systemPrompt: string;
  userText: string;
  imageDataUrl?: string;
  /** 覆盖厂商配置里的「输出 token 限额」；不传则用 provider.maxTokens */
  maxTokens?: number;
  /** 转发给扣子平台的运行时头，仅内置厂商需要 */
  forwardHeaders?: Record<string, string>;
}

export interface RunChatResult {
  text: string;
  providerId: string;
  providerName: string;
  model: string;
  latencyMs: number;
}

export async function runChat(
  provider: ResolvedProvider,
  input: RunChatInput,
): Promise<RunChatResult> {
  const startedAt = Date.now();
  const maxTokens = input.maxTokens ?? provider.maxTokens;

  const text =
    provider.kind === 'coze'
      ? await callCoze(provider, input)
      : await callHttpProvider(provider, {
          systemPrompt: input.systemPrompt,
          userText: input.userText,
          imageDataUrl: input.imageDataUrl,
          maxTokens,
          temperature: provider.temperature,
          thinking: provider.thinking,
        });

  return {
    text,
    providerId: provider.providerId,
    providerName: provider.name,
    model: provider.model,
    latencyMs: Date.now() - startedAt,
  };
}

async function callCoze(provider: ResolvedProvider, input: RunChatInput): Promise<string> {
  const client = new LLMClient(new Config(), input.forwardHeaders ?? {});

  const userContent = input.imageDataUrl
    ? [
        { type: 'text' as const, text: input.userText },
        { type: 'image_url' as const, image_url: { url: input.imageDataUrl, detail: 'high' as const } },
      ]
    : input.userText;

  const response = await client.invoke(
    [
      { role: 'system' as const, content: input.systemPrompt },
      { role: 'user' as const, content: userContent },
    ],
    {
      model: provider.model,
      temperature: provider.temperature,
      thinking: provider.thinking ? 'enabled' : 'disabled',
    },
  );

  return response.content ?? '';
}

async function callHttpProvider(
  provider: ResolvedProvider,
  content: ChatContent,
): Promise<string> {
  const { url, headers, body } = buildHttpRequest(provider, content);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const raw = await response.text();
    const payload = safeJsonParse(raw);

    if (!response.ok) {
      const message = extractErrorMessage(payload, raw.slice(0, 300) || response.statusText);
      throw new ProviderError(
        `${provider.name} 返回 ${response.status}：${redact(message, provider.apiKey)}`,
        response.status,
        provider.providerId,
        provider.model,
      );
    }

    const text = extractAssistantText(provider.kind, payload);
    if (!text) {
      // 空正文的原因很多（推理占满预算 / 被限额截断 / 安全过滤 / 真不支持图片），
      // 交给 describeEmptyContent 依据 finish_reason 与推理用量给出准确说法
      throw new ProviderError(
        `${provider.name} 返回了空内容：${describeEmptyContent(payload, provider.model)}`,
        502,
        provider.providerId,
        provider.model,
      );
    }
    return text;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ProviderError(
        `${provider.name} 请求超时（${REQUEST_TIMEOUT_MS / 1000}s）`,
        504,
        provider.providerId,
        provider.model,
      );
    }
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ProviderError(
      `${provider.name} 请求失败：${redact(message, provider.apiKey)}`,
      502,
      provider.providerId,
      provider.model,
    );
  } finally {
    clearTimeout(timer);
  }
}

function buildHttpRequest(
  provider: ResolvedProvider,
  content: ChatContent,
): { url: string; headers: Record<string, string>; body: unknown } {
  if (provider.kind === 'anthropic') {
    return {
      url: buildAnthropicEndpoint(provider.baseUrl),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: buildAnthropicBody(provider.model, content),
    };
  }

  if (provider.kind === 'gemini') {
    return {
      url: buildGeminiEndpoint(provider.baseUrl, provider.model, provider.apiKey),
      headers: { 'Content-Type': 'application/json' },
      body: buildGeminiBody(content),
    };
  }

  return {
    url: buildOpenAIEndpoint(provider.baseUrl),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: buildOpenAIBody(provider.model, content),
  };
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** 错误信息里绝对不能出现密钥 */
function redact(message: string, apiKey: string): string {
  if (!apiKey) return message;
  return message.split(apiKey).join('***');
}
