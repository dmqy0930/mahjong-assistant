/**
 * 统一解析接口响应。
 *
 * 服务端不一定返回 JSON：Vercel 在函数超时、崩溃或请求体过大时，
 * 会直接回一段纯文本/HTML 错误页（如 "An error occurred..."）。
 * 直接 res.json() 会抛出 "Unexpected token 'A' ... is not valid JSON"，
 * 对排查毫无帮助，所以这里先读文本再尝试解析。
 */

export interface ParsedResponse {
  ok: boolean;
  status: number;
  data?: Record<string, unknown>;
  error?: string;
}

const TEXT_LIMIT = 200;

function snippet(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return trimmed.length > TEXT_LIMIT ? `${trimmed.slice(0, TEXT_LIMIT)}…` : trimmed;
}

function platformHint(status: number, body: string): string {
  if (status === 413) {
    return '图片过大，被服务器拒绝。Vercel 对请求体有约 4.5MB 的硬限制，可改用自建部署或先压缩图片';
  }
  if (status === 504 || /timed? ?out/i.test(body)) {
    return '识别超时：模型响应时间超过了函数上限。可以试着换更快的模型，或关闭「思考」开关';
  }
  if (status === 500 || status === 502 || /An error occurred|FUNCTION_INVOCATION_FAILED/i.test(body)) {
    return '服务端运行出错，通常能在部署平台的函数日志里看到具体原因';
  }
  return '';
}

export async function readJsonResponse(res: Response): Promise<ParsedResponse> {
  const text = await res.text();

  let data: Record<string, unknown> | undefined;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') data = parsed as Record<string, unknown>;
  } catch {
    data = undefined;
  }

  const hint = platformHint(res.status, text);

  if (!res.ok) {
    const fromBody = typeof data?.error === 'string' ? data.error : '';
    return {
      ok: false,
      status: res.status,
      error: [fromBody, hint].filter(Boolean).join('｜') ||
        `服务返回 HTTP ${res.status}：${snippet(text) || '（空响应）'}`,
      data,
    };
  }

  if (!data) {
    return {
      ok: false,
      status: res.status,
      error: `服务返回了非 JSON 内容：${snippet(text) || '（空响应）'}`,
    };
  }

  return { ok: true, status: res.status, data };
}
