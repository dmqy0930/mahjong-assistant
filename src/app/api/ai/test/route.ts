import { NextRequest, NextResponse } from 'next/server';
import { HeaderUtils } from 'coze-coding-dev-sdk';
import { ProviderError, runChat } from '@/lib/ai/dispatch';
import {
  describeRequestTarget,
  resolveProvider,
  validateProvider,
  type ProviderConfigInput,
} from '@/lib/ai/providers';

export const runtime = 'nodejs';
export const maxDuration = 30;

const TEST_SYSTEM_PROMPT = '你是一个连通性测试助手，请严格按要求回答。';

/** 用一次极小的请求验证配置是否可用 */
export async function POST(request: NextRequest) {
  let body: { provider?: unknown; vision?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const provider = resolveProvider(normalizeProviderInput(body.provider));
  const problems = validateProvider(provider);
  if (problems.length > 0) {
    return NextResponse.json({ ok: false, error: `配置不完整：${problems.join('、')}` }, { status: 400 });
  }

  // 1x1 的透明 PNG，用于顺带验证模型是否接受图片输入
  const probeImage =
    typeof body.vision === 'boolean' && body.vision
      ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
      : undefined;

  try {
    const result = await runChat(provider, {
      systemPrompt: TEST_SYSTEM_PROMPT,
      userText: probeImage
        ? '请回复"连通正常"四个字，并说明这张图片有几个像素。'
        : '请只回复四个字：连通正常',
      imageDataUrl: probeImage,
      maxTokens: 64,
      forwardHeaders: HeaderUtils.extractForwardHeaders(request.headers),
    });

    return NextResponse.json({
      ok: true,
      providerId: result.providerId,
      providerName: result.providerName,
      model: result.model,
      latencyMs: result.latencyMs,
      reply: result.text.trim().slice(0, 200),
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      return NextResponse.json(
        {
          ok: false,
          error: `${error.message}（模型 ${error.model} · 地址 ${describeRequestTarget(provider)}）`,
          providerId: error.providerId,
          model: error.model,
          endpoint: describeRequestTarget(provider),
        },
        { status: 200 },
      );
    }
    console.error('[ai/test] unexpected error:', error);
    return NextResponse.json({ ok: false, error: '测试失败，请检查网络与配置' }, { status: 200 });
  }
}

function normalizeProviderInput(input: unknown): ProviderConfigInput {
  if (typeof input !== 'object' || input === null) return { providerId: 'coze' };
  const raw = input as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === 'string' ? value : undefined);
  const num = (value: unknown) => (typeof value === 'number' ? value : undefined);

  return {
    providerId: str(raw.providerId) ?? 'coze',
    baseUrl: str(raw.baseUrl),
    apiKey: str(raw.apiKey),
    model: str(raw.model),
    temperature: num(raw.temperature),
    maxTokens: num(raw.maxTokens),
    thinking: typeof raw.thinking === 'boolean' ? raw.thinking : undefined,
  };
}
