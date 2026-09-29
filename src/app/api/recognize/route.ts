import { NextRequest, NextResponse } from 'next/server';
import { HeaderUtils } from 'coze-coding-dev-sdk';
import { ProviderError, runChat } from '@/lib/ai/dispatch';
import { RECOGNIZE_SYSTEM_PROMPT, RECOGNIZE_USER_TEXT, extractJsonObject } from '@/lib/ai/prompt';
import { resolveProvider, validateProvider, type ProviderConfigInput } from '@/lib/ai/providers';
import { formatProbe, sniffImage } from '@/lib/ai/image';

export const runtime = 'nodejs';
// 视觉识别通常需要 20~40 秒，必须显式放宽，否则会被平台默认超时掐断
export const maxDuration = 60;

// 客户端已统一压缩为 JPEG，这里按 Vercel 的 4.5MB 请求体上限留出余量
const MAX_IMAGE_CHARS = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  let body: { imageBase64?: unknown; provider?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const { imageBase64 } = body;
  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
    return NextResponse.json({ error: '缺少图片数据（imageBase64）' }, { status: 400 });
  }
  if (!imageBase64.startsWith('data:image/')) {
    return NextResponse.json({ error: '图片格式不正确，应为 data:image/... 开头' }, { status: 400 });
  }
  if (imageBase64.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: '图片过大，请压缩后重试' }, { status: 413 });
  }

  // 厂商一律按文件内容判断格式，所以先按字节头自检，避免把无效数据发给上游
  const probe = sniffImage(imageBase64);
  if (probe.detectedType === 'unknown') {
    console.error('[recognize] invalid image payload:', formatProbe(probe));
    return NextResponse.json(
      {
        error: `收到的不是有效图片（声明 ${probe.declaredType}，字节头 ${probe.magicHex || '空'}，${Math.round(probe.bytes / 1024)}KB）。请重新选择 JPG/PNG 图片。`,
        probe,
      },
      { status: 400 },
    );
  }

  const provider = resolveProvider(normalizeProviderInput(body.provider));
  const problems = validateProvider(provider);
  if (problems.length > 0) {
    return NextResponse.json(
      { error: `API 配置不完整：${problems.join('、')}`, providerId: provider.providerId },
      { status: 400 },
    );
  }
  if (!provider.supportsVision) {
    return NextResponse.json(
      { error: `${provider.name} 的所选模型不支持图片输入，请在 API 配置中更换模型`, providerId: provider.providerId },
      { status: 400 },
    );
  }

  try {
    const result = await runChat(provider, {
      systemPrompt: RECOGNIZE_SYSTEM_PROMPT,
      userText: RECOGNIZE_USER_TEXT,
      imageDataUrl: imageBase64,
      forwardHeaders: HeaderUtils.extractForwardHeaders(request.headers),
    });

    const parsed = extractJsonObject(result.text);
    if (!parsed) {
      return NextResponse.json(
        { error: '无法解析识别结果，请重试或更换模型', raw: result.text.slice(0, 500) },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ...(parsed as Record<string, unknown>),
      _meta: { providerId: result.providerId, model: result.model, latencyMs: result.latencyMs },
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      console.error(
        `[recognize] ${error.providerId} failed:`,
        error.message,
        '| payload:',
        formatProbe(probe),
      );
      return NextResponse.json(
        {
          error: `${error.message}（模型 ${error.model}）`,
          providerId: error.providerId,
          model: error.model,
          probe,
        },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
      );
    }
    console.error('[recognize] unexpected error:', error);
    return NextResponse.json({ error: '识别失败，请重试' }, { status: 500 });
  }
}

/** 只接受白名单字段，避免把任意内容透传给上游 */
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
  };
}
