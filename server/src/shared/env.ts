import logger from './logger';

interface EnvConfig {
  DATABASE_URL: string;
  JWT_SECRET: string;
  PORT: number;
  NODE_ENV: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
}

function parsePositiveInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
}

export function validateEnv(): EnvConfig {
  const missing: string[] = [];

  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    logger.error(`缺少必需的环境变量: ${missing.join(', ')}`);
    logger.error('请参考 server/env.example 配置 .env 文件');
    process.exit(1);
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    PORT: parseInt(process.env.PORT || '3000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    RATE_LIMIT_WINDOW_MS: parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60000),
    RATE_LIMIT_MAX_REQUESTS: parsePositiveInt(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
  };
}
