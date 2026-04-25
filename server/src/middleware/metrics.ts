import { NextFunction, Request, Response } from 'express';
import { recordResponseStatus } from '../shared/releaseState';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      recordResponseStatus(res.statusCode);
    }
  });
  next();
}
