import { describe, expect, it } from 'vitest';
import { readJsonResponse } from './http';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('readJsonResponse', () => {
  it('正常 JSON 直接返回数据', async () => {
    const result = await readJsonResponse(jsonResponse({ handTiles: [] }));
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ handTiles: [] });
  });

  it('业务错误从 error 字段取出', async () => {
    const result = await readJsonResponse(jsonResponse({ error: '无役不能和牌' }, 400));
    expect(result.ok).toBe(false);
    expect(result.error).toContain('无役不能和牌');
  });

  // 这是本次报错的根因：平台错误页不是 JSON，直接 res.json() 会抛解析错误
  it('平台返回纯文本错误页时给出可读提示，而不是 JSON 解析错误', async () => {
    const result = await readJsonResponse(
      new Response('An error occurred while handling this request', { status: 500 }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain('服务端运行出错');
    expect(result.error).not.toContain('Unexpected token');
  });

  it('413 提示图片过大', async () => {
    const result = await readJsonResponse(new Response('Request Entity Too Large', { status: 413 }));
    expect(result.error).toContain('图片过大');
  });

  it('504 提示识别超时', async () => {
    const result = await readJsonResponse(new Response('', { status: 504 }));
    expect(result.error).toContain('超时');
  });

  it('200 但内容不是 JSON 时也能说明问题', async () => {
    const result = await readJsonResponse(new Response('<html>hello</html>', { status: 200 }));
    expect(result.ok).toBe(false);
    expect(result.error).toContain('非 JSON');
  });

  it('空响应不会崩', async () => {
    const result = await readJsonResponse(new Response('', { status: 500 }));
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
