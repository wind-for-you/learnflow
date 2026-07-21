/**
 * 从 OpenAI 兼容 chat.completions 响应中提取可读文本。
 * 兼容推理模型（如 mimo）：content 为空时回退 reasoning_content。
 */
export function extractChatMessageText(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const m = message as Record<string, unknown>;
  const content = typeof m.content === 'string' ? m.content.trim() : '';
  if (content) return content;
  const reasoning =
    typeof m.reasoning_content === 'string'
      ? m.reasoning_content.trim()
      : typeof m.reasoning === 'string'
        ? m.reasoning.trim()
        : '';
  return reasoning;
}

/** 计划生成类请求建议至少给足的超时（推理模型较慢） */
export const PLAN_GENERATION_MIN_TIMEOUT_MS = 90000;

/** 计划生成建议 max_tokens（含 reasoning） */
export const PLAN_GENERATION_MAX_TOKENS = 8000;
