import { validateEnv } from './env';

describe('Environment Validation - Rate Limit Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should use default rate limit values when env vars not set', () => {
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;

    const config = validateEnv();

    expect(config.RATE_LIMIT_WINDOW_MS).toBe(60000);
    expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(100);
  });

  it('should parse valid rate limit env vars', () => {
    process.env.RATE_LIMIT_WINDOW_MS = '900000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '200';

    const config = validateEnv();

    expect(config.RATE_LIMIT_WINDOW_MS).toBe(900000);
    expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(200);
  });

  it('should fall back to defaults for invalid numeric values', () => {
    process.env.RATE_LIMIT_WINDOW_MS = 'not-a-number';
    process.env.RATE_LIMIT_MAX_REQUESTS = 'invalid';

    const config = validateEnv();

    expect(config.RATE_LIMIT_WINDOW_MS).toBe(60000);
    expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(100);
  });

  it('should fall back to defaults for zero or negative values', () => {
    process.env.RATE_LIMIT_WINDOW_MS = '0';
    process.env.RATE_LIMIT_MAX_REQUESTS = '-50';

    const config = validateEnv();

    expect(config.RATE_LIMIT_WINDOW_MS).toBe(60000);
    expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(100);
  });

  it('should accept valid positive values', () => {
    process.env.RATE_LIMIT_WINDOW_MS = '30000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '50';

    const config = validateEnv();

    expect(config.RATE_LIMIT_WINDOW_MS).toBe(30000);
    expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(50);
  });
});
