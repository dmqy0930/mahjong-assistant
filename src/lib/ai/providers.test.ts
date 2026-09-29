import { describe, expect, it } from 'vitest';
import {
  buildAnthropicBody,
  buildAnthropicEndpoint,
  buildGeminiEndpoint,
  buildOpenAIBody,
  buildOpenAIEndpoint,
  clampTemperature,
  extractAssistantText,
  extractErrorMessage,
  parseDataUrl,
  resolveProvider,
  validateProvider,
  PROVIDER_PRESETS,
  type ChatContent,
} from './providers';
import { extractJsonObject } from './prompt';

describe('endpoint 构造', () => {
  it('只有域名时自动补 /v1', () => {
    expect(buildOpenAIEndpoint('https://api.openai.com')).toBe(
      'https://api.openai.com/v1/chat/completions',
    );
  });

  it('已带 /v1 时直接拼接', () => {
    expect(buildOpenAIEndpoint('https://api.deepseek.com/v1')).toBe(
      'https://api.deepseek.com/v1/chat/completions',
    );
  });

  it('误填完整路径时不重复拼接', () => {
    expect(buildOpenAIEndpoint('https://gw.example.com/v1/chat/completions')).toBe(
      'https://gw.example.com/v1/chat/completions',
    );
  });

  it('末尾多余斜杠会被清理', () => {
    expect(buildOpenAIEndpoint('https://gw.example.com/v1//')).toBe(
      'https://gw.example.com/v1/chat/completions',
    );
  });

  it('Anthropic 补 /v1/messages', () => {
    expect(buildAnthropicEndpoint('https://api.anthropic.com')).toBe(
      'https://api.anthropic.com/v1/messages',
    );
    expect(buildAnthropicEndpoint('https://api.anthropic.com/v1')).toBe(
      'https://api.anthropic.com/v1/messages',
    );
  });

  it('Gemini 走 v1beta + key 查询参数', () => {
    expect(buildGeminiEndpoint('https://generativelanguage.googleapis.com', 'gemini-2.0-flash', 'K')).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=K',
    );
  });
});

describe('parseDataUrl', () => {
  it('拆出 MIME 与 base64', () => {
    expect(parseDataUrl('data:image/png;base64,AAAA')).toEqual({
      mediaType: 'image/png',
      data: 'AAAA',
    });
  });

  it('非 dataURL 时按 jpeg 兜底', () => {
    expect(parseDataUrl('AAAA')).toEqual({ mediaType: 'image/jpeg', data: 'AAAA' });
  });
});

describe('请求体构造', () => {
  const content: ChatContent = {
    systemPrompt: 'sys',
    userText: 'hi',
    imageDataUrl: 'data:image/png;base64,AAAA',
    maxTokens: 128,
    temperature: 0.3,
  };

  it('OpenAI 兼容把图片放进 image_url', () => {
    const body = buildOpenAIBody('gpt-4o-mini', content) as {
      messages: { role: string; content: unknown }[];
    };
    expect(body.messages[0]).toEqual({ role: 'system', content: 'sys' });
    expect(body.messages[1].content).toEqual([
      { type: 'text', text: 'hi' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
    ]);
  });

  it('无图片时 OpenAI content 退化为字符串', () => {
    const body = buildOpenAIBody('gpt-4o-mini', { ...content, imageDataUrl: undefined }) as {
      messages: { content: unknown }[];
    };
    expect(body.messages[1].content).toBe('hi');
  });

  it('Anthropic 使用 base64 source 结构', () => {
    const body = buildAnthropicBody('claude-3-5-sonnet-latest', content) as {
      system: string;
      messages: { content: unknown[] }[];
    };
    expect(body.system).toBe('sys');
    expect(body.messages[0].content[1]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: 'AAAA' },
    });
  });
});

describe('响应解析', () => {
  it('OpenAI 字符串内容', () => {
    expect(extractAssistantText('openai-compatible', { choices: [{ message: { content: 'ok' } }] })).toBe('ok');
  });

  it('OpenAI 数组内容会拼接', () => {
    const payload = { choices: [{ message: { content: [{ text: 'a' }, { text: 'b' }] } }] };
    expect(extractAssistantText('openai-compatible', payload)).toBe('ab');
  });

  it('Anthropic content blocks', () => {
    expect(extractAssistantText('anthropic', { content: [{ type: 'text', text: 'x' }] })).toBe('x');
  });

  it('Gemini candidates parts', () => {
    const payload = { candidates: [{ content: { parts: [{ text: 'g' }] } }] };
    expect(extractAssistantText('gemini', payload)).toBe('g');
  });

  it('异常结构返回空字符串而不是抛错', () => {
    expect(extractAssistantText('openai-compatible', null)).toBe('');
    expect(extractAssistantText('gemini', { candidates: [] })).toBe('');
  });

  it('错误信息提取', () => {
    expect(extractErrorMessage({ error: { message: 'bad key' } }, 'fallback')).toBe('bad key');
    expect(extractErrorMessage({ message: 'oops' }, 'fallback')).toBe('oops');
    expect(extractErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});

describe('resolveProvider', () => {
  it('缺少字段时回落到预设默认值', () => {
    const provider = resolveProvider({ providerId: 'openai' });
    expect(provider.kind).toBe('openai-compatible');
    expect(provider.baseUrl).toBe('https://api.openai.com/v1');
    expect(provider.model).toBe('gpt-4o-mini');
    expect(provider.temperature).toBe(0.2);
  });

  it('用户填写值优先于预设', () => {
    const provider = resolveProvider({
      providerId: 'custom',
      baseUrl: 'https://gw.local/v1',
      apiKey: 'k',
      model: 'my-vl',
      temperature: 0.9,
    });
    expect(provider.baseUrl).toBe('https://gw.local/v1');
    expect(provider.model).toBe('my-vl');
    expect(provider.temperature).toBe(0.9);
  });

  it('未知厂商回落到自定义预设', () => {
    const provider = resolveProvider({ providerId: 'not-exist' });
    expect(provider.providerId).toBe('custom');
    expect(provider.kind).toBe('openai-compatible');
  });
});

describe('validateProvider', () => {
  it('内置扣子无需任何字段', () => {
    expect(validateProvider(resolveProvider({ providerId: 'coze' }))).toEqual([]);
  });

  it('第三方厂商缺 Key 时给出提示', () => {
    expect(validateProvider(resolveProvider({ providerId: 'openai' }))).toEqual(['缺少 API Key']);
  });

  it('自定义网关缺 Base URL / 模型时全部列出', () => {
    const problems = validateProvider(resolveProvider({ providerId: 'custom', apiKey: 'k' }));
    expect(problems).toContain('缺少 Base URL');
    expect(problems).toContain('缺少模型名');
  });
});

describe('clampTemperature', () => {
  it('越界与非法值都会被收敛', () => {
    expect(clampTemperature(undefined)).toBe(0.2);
    expect(clampTemperature(Number.NaN)).toBe(0.2);
    expect(clampTemperature(5)).toBe(2);
    expect(clampTemperature(-1)).toBe(0);
  });
});

describe('厂商预设', () => {
  it('预设 id 唯一', () => {
    const ids = PROVIDER_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('至少提供一个不支持图片的厂商标注，用于界面提醒', () => {
    expect(PROVIDER_PRESETS.filter(p => !p.supportsVision).length).toBeGreaterThan(0);
  });
});

describe('extractJsonObject', () => {
  it('能从 ```json 代码块中提取', () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('能从带前后缀的文本中提取', () => {
    expect(extractJsonObject('识别结果如下：{"a":1} 完毕')).toEqual({ a: 1 });
  });

  it('没有 JSON 时返回 undefined', () => {
    expect(extractJsonObject('没有结果')).toBeUndefined();
  });
});
