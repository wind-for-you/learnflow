export interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface UnwrapResult<T> {
  data: T;
  message?: string;
}

export function unwrapEnvelope<T>(
  payload: unknown,
  selector?: (raw: any) => T,
): UnwrapResult<T> {
  if (payload && typeof payload === 'object') {
    const maybeEnvelope = payload as Partial<Envelope<T>>;
    if (typeof maybeEnvelope.success === 'boolean' && 'data' in maybeEnvelope) {
      return {
        data: maybeEnvelope.data as T,
        message: maybeEnvelope.message,
      };
    }
  }

  if (selector) {
    const raw = payload as any;
    return {
      data: selector(raw),
      message: raw?.message,
    };
  }

  const raw = payload as any;
  return {
    data: raw as T,
    message: raw?.message,
  };
}
