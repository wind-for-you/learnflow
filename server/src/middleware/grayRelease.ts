import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth';

function hashUserToPercent(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

export function grayReleaseGuard(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const enabled = process.env.GRAY_RELEASE_ENABLED === 'true';
  if (!enabled) {
    next();
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: '用户未认证' });
    return;
  }

  const whitelist = (process.env.GRAY_RELEASE_USERS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (whitelist.includes(userId)) {
    next();
    return;
  }

  const rolloutPercent = Number(process.env.GRAY_RELEASE_PERCENT || '0');
  const bucket = hashUserToPercent(userId);

  if (bucket < rolloutPercent) {
    next();
    return;
  }

  res.status(403).json({
    error: 'Feature Disabled',
    message: '当前功能处于灰度阶段，暂未开放',
  });
}
