import { describe, expect, it } from 'vitest';
import {
  buildAnthropicBody,
  buildAnthropicEndpoint,
  buildGeminiEndpoint,
  buildOpenAIBody,
  buildOpenAIEndpoint,
  clampMaxTokens,
  clampTemperature,
  describeEmptyContent,
  describeRequestTarget,
  extractAssistantText,
  extractErrorMessage,
  extractFinishReason,
  extractReasoningTokens,
  parseDataUrl,
  resolveProvider,
  validateProvider,
  DEFAULT_MAX_TOKENS,
  MAX_MAX_TOKENS,
  MIN_MAX_TOKENS,
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

  // 回归用例：DeepSeek 的接口挂在根路径下，不能被自动补成 /v1
  it('DeepSeek 只有域名时不补 /v1', () => {
    expect(buildOpenAIEndpoint('https://api.deepseek.com')).toBe(
      'https://api.deepseek.com/chat/completions',
    );
  });

  it('其他主机只有域名时也保持原样', () => {
    expect(buildOpenAIEndpoint('https://gw.example.com')).toBe(
      'https://gw.example.com/chat/completions',
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

  // 固化与厂商文档一致的消息结构，防止后续重构改坏
  it('消息结构与厂商文档一致：system 消息 + 用户消息内的 text/image_url 块', () => {
    const body = buildOpenAIBody('deepseek-flash', content) as {
      messages: { role: string; content: unknown }[];
    };
    expect(body.messages).toHaveLength(2);
    expect(body.messages.map(m => m.role)).toEqual(['system', 'user']);

    const userContent = body.messages[1].content as { type: string }[];
    expect(userContent.map(part => part.type)).toEqual(['text', 'image_url']);
  });

  it('无图片时 OpenAI content 退化为字符串', () => {
    const body = buildOpenAIBody('gpt-4o-mini', { ...content, imageDataUrl: undefined }) as {
      messages: { content: unknown }[];
    };
    expect(body.messages[1].content).toBe('hi');
  });

  // 推理模型会先用 reasoning tokens 思考且与 max_tokens 共享额度，
  // 因此请求体始终显式声明 thinking，缺省为 disabled
  it('OpenAI 兼容请求体总是携带 thinking，缺省关闭', () => {
    const body = buildOpenAIBody('deepseek-flash', content) as {
      thinking: { type: string };
      max_tokens: number;
    };
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.max_tokens).toBe(128);

    const enabled = buildOpenAIBody('deepseek-flash', { ...content, thinking: true }) as {
      thinking: { type: string };
    };
    expect(enabled.thinking).toEqual({ type: 'enabled' });
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
  it('什么都不填时不会用预设值兜底', () => {
    const provider = resolveProvider({ providerId: 'openai' });
    expect(provider.kind).toBe('openai-compatible');
    expect(provider.baseUrl).toBe('');
    expect(provider.model).toBe('');
    expect(provider.apiKey).toBe('');
    expect(provider.temperature).toBe(0.2);
  });

  // 需求：所有厂商的地址与模型一律由用户填写，不预置
  it('全部厂商都不预置 Base URL 与模型名', () => {
    for (const preset of PROVIDER_PRESETS) {
      const provider = resolveProvider({ providerId: preset.id });
      expect(provider.baseUrl).toBe('');
      expect(provider.model).toBe('');
    }
  });

  it('原样采用用户填写的值', () => {
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

describe('describeRequestTarget', () => {
  it('DeepSeek 不带 /v1', () => {
    const provider = resolveProvider({
      providerId: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-flash',
    });
    expect(describeRequestTarget(provider)).toBe('https://api.deepseek.com/chat/completions');
  });

  it('未填写地址时给出明确提示', () => {
    expect(describeRequestTarget(resolveProvider({ providerId: 'openai' }))).toBe(
      '（尚未填写 Base URL）',
    );
  });

  it('Gemini 的密钥用占位符替换，不泄漏', () => {
    const target = describeRequestTarget(
      resolveProvider({
        providerId: 'gemini',
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKey: 'SECRET-KEY',
        model: 'gemini-2.0-flash',
      }),
    );
    expect(target).toContain('key=***');
    expect(target).not.toContain('SECRET-KEY');
  });

  it('内置扣子不暴露地址', () => {
    expect(describeRequestTarget(resolveProvider({ providerId: 'coze' }))).toBe('平台内置（扣子）');
  });
});

describe('validateProvider', () => {
  it('内置扣子只需要模型名', () => {
    expect(validateProvider(resolveProvider({ providerId: 'coze', model: 'x' }))).toEqual([]);
    expect(validateProvider(resolveProvider({ providerId: 'coze' }))).toEqual(['缺少模型名']);
  });

  it('第三方厂商未填写时列出全部缺失项', () => {
    expect(validateProvider(resolveProvider({ providerId: 'openai' }))).toEqual([
      '缺少 Base URL',
      '缺少 API Key',
      '缺少模型名',
    ]);
  });

  it('填全之后没有问题', () => {
    const provider = resolveProvider({
      providerId: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      apiKey: 'k',
      model: 'deepseek-flash',
    });
    expect(validateProvider(provider)).toEqual([]);
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

describe('输出 token 限额', () => {
  it('未填写时回落到默认 8192', () => {
    expect(resolveProvider({ providerId: 'openai' }).maxTokens).toBe(DEFAULT_MAX_TOKENS);
    expect(DEFAULT_MAX_TOKENS).toBe(8192);
  });

  it('越界与非法值都会被收敛', () => {
    expect(clampMaxTokens(undefined)).toBe(DEFAULT_MAX_TOKENS);
    expect(clampMaxTokens(Number.NaN)).toBe(DEFAULT_MAX_TOKENS);
    expect(clampMaxTokens(0)).toBe(MIN_MAX_TOKENS);
    expect(clampMaxTokens(4096)).toBe(4096);
    expect(clampMaxTokens(1e9)).toBe(MAX_MAX_TOKENS);
    expect(clampMaxTokens(4096.6)).toBe(4097);
  });

  it('用户填写的限额优先于默认值', () => {
    expect(resolveProvider({ providerId: 'deepseek', maxTokens: 4096 }).maxTokens).toBe(4096);
  });
});

describe('思考开关', () => {
  it('默认关闭，只有显式 true 才开启', () => {
    expect(resolveProvider({ providerId: 'deepseek' }).thinking).toBe(false);
    expect(resolveProvider({ providerId: 'deepseek', thinking: true }).thinking).toBe(true);
  });
});

describe('空内容的诊断信息', () => {
  it('推理占满预算时说明真实原因并给出两个抓手', () => {
    const payload = {
      choices: [{ finish_reason: 'length', message: { content: '' } }],
      usage: { completion_tokens_details: { reasoning_tokens: 2048 } },
    };
    const message = describeEmptyContent(payload, 'deepseek-flash');
    expect(message).toContain('2048');
    expect(message).toContain('思考');
    expect(message).toContain('输出 token 限额');
  });

  it('单纯被限额截断', () => {
    const payload = { choices: [{ finish_reason: 'length' }] };
    expect(describeEmptyContent(payload, 'm')).toContain('token 限额截断');
  });

  it('安全策略拦截', () => {
    expect(describeEmptyContent({ choices: [{ finish_reason: 'content_filter' }] }, 'm')).toContain(
      '安全策略',
    );
  });

  it('无从判断时回落到"确认是否支持图片"', () => {
    expect(describeEmptyContent(null, 'gpt-4o-mini')).toContain('支持图片输入');
    expect(describeEmptyContent(null, 'gpt-4o-mini')).toContain('gpt-4o-mini');
  });

  it('能识别各家不同的结束原因与推理用量字段', () => {
    expect(extractFinishReason({ stop_reason: 'max_tokens' })).toBe('max_tokens');
    expect(extractFinishReason({ candidates: [{ finishReason: 'MAX_TOKENS' }] })).toBe('MAX_TOKENS');
    expect(extractReasoningTokens({ usage: { reasoning_tokens: 12 } })).toBe(12);
    expect(extractReasoningTokens({ usage: { output_tokens_details: { reasoning_tokens: 34 } } })).toBe(34);
    expect(extractReasoningTokens({ usage: {} })).toBe(0);
  });
});

describe('厂商预设', () => {
  it('预设 id 唯一', () => {
    const ids = PROVIDER_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // 回归用例：DeepSeek 的旧型号名已退役，deepseek-flash 才是当前支持图片输入的模型
  it('DeepSeek 预设使用 deepseek-flash 并标记支持图片', () => {
    const deepseek = PROVIDER_PRESETS.find(p => p.id === 'deepseek');
    expect(deepseek?.exampleModel).toBe('deepseek-flash');
    expect(deepseek?.suggestedModels).toContain('deepseek-flash');
    expect(deepseek?.supportsVision).toBe(true);
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
