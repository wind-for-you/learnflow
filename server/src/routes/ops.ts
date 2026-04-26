import { Router, Response } from 'express';
import prisma from '../shared/prisma';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { getReleaseMetrics } from '../shared/releaseState';
import { getAgentTaskQueueStats } from '../agent/runtime/inMemoryAgentTaskQueue';

const router = Router();
router.use(requireAuth, requireAdmin);

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

router.get('/queue-metrics', async (_req, res: Response): Promise<void> => {
  const counts = await getAgentTaskQueueStats();
  const tasksByState = await prisma.agentTask.groupBy({
    by: ['state'],
    _count: { state: true },
  });

  res.json({
    success: true,
    data: {
      queue: counts,
      dbTaskState: tasksByState.map((item) => ({
        state: item.state,
        count: item._count.state,
      })),
    },
  });
});

router.get('/system-overview', async (_req, res: Response): Promise<void> => {
  const [releaseMetrics, queueMetrics, failedTaskCount] = await Promise.all([
    Promise.resolve(getReleaseMetrics()),
    getAgentTaskQueueStats(),
    prisma.agentTask.count({
      where: {
        state: 'ERROR',
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      releaseMetrics,
      queueMetrics,
      failedTaskCount,
      redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
      workerConcurrency: parseInt(process.env.AGENT_WORKER_CONCURRENCY || '4', 10),
      serverTime: new Date().toISOString(),
    },
  });
});

export default router;
