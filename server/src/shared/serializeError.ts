/**
 * 将未知错误转为可日志 / 可落库的结构，避免 logger 打出 `error: {}`
 */
export function serializeError(err: unknown): {
  message: string;
  name?: string;
  stack?: string;
  cause?: string;
} {
  if (err instanceof Error) {
    let causeStr: string | undefined;
    const c = (err as Error & { cause?: unknown }).cause;
    if (c instanceof Error) {
      causeStr = c.message;
    } else if (typeof c === 'string') {
      causeStr = c;
    } else if (c !== undefined && c !== null) {
      try {
        causeStr = JSON.stringify(c);
      } catch {
        causeStr = String(c);
      }
    }
    return {
      name: err.name,
      message: err.message || '(empty message)',
      stack: err.stack,
      cause: causeStr,
    };
  }
  if (typeof err === 'string') {
    return { message: err };
  }
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: String(err) };
  }
}

export function formatErrorForStorage(err: unknown, maxLen = 2000): string {
  const s = serializeError(err);
  const line = [s.name, s.message, s.cause].filter(Boolean).join(' | ');
  const tail = s.stack ? ` || ${s.stack}` : '';
  const full = line + tail;
  return full.length > maxLen ? full.slice(0, maxLen) : full;
}
