/**
 * 提取需要转发给扣子平台的运行时头。
 *
 * 这里刻意用动态 import 并吞掉异常：只要 coze-coding-dev-sdk 在部署环境里
 * 加载失败，顶层静态 import 就会让整个路由函数崩溃（表现为平台错误页），
 * 而不是一条能看懂的报错。非内置厂商本来也不需要这些头。
 */
export async function extractForwardHeaders(
  headers: Headers,
): Promise<Record<string, string>> {
  try {
    const { HeaderUtils } = await import('coze-coding-dev-sdk');
    return HeaderUtils.extractForwardHeaders(headers);
  } catch (error) {
    console.warn('[forward-headers] 扣子 SDK 不可用，已跳过转发头', error);
    return {};
  }
}
