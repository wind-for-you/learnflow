import { Router, Response } from 'express';
import { getReleaseMetrics } from '../shared/releaseState';

const router = Router();

/**
 * GET /api/ops/release-metrics
 * 发布观察窗口指标（内存态）
 */
router.get('/release-metrics', (req, res: Response) => {
  const metrics = getReleaseMetrics();
  res.json({
    success: true,
    data: metrics,
  });
});

export default router;
