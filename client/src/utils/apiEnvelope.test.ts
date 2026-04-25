import { describe, expect, it } from 'vitest';
import { unwrapEnvelope } from './apiEnvelope';

describe('unwrapEnvelope', () => {
  it('parses success/data envelope response', () => {
    const result = unwrapEnvelope<{ value: number }>({
      success: true,
      data: { value: 42 },
      message: 'ok',
    });

    expect(result.data.value).toBe(42);
    expect(result.message).toBe('ok');
  });

  it('falls back to selector for legacy response', () => {
    const result = unwrapEnvelope<{ token: string; userId: string }>(
      {
        token: 'abc',
        user: { id: 'u_1' },
        message: 'legacy',
      },
      (raw) => ({
        token: raw.token,
        userId: raw.user.id,
      }),
    );

    expect(result.data.token).toBe('abc');
    expect(result.data.userId).toBe('u_1');
    expect(result.message).toBe('legacy');
  });

  it('returns raw payload when no selector provided', () => {
    const payload = { goals: [{ id: 'g1' }] };
    const result = unwrapEnvelope<typeof payload>(payload);
    expect(result.data.goals[0].id).toBe('g1');
    expect(result.message).toBeUndefined();
  });
});
