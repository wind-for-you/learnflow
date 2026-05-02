import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
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

/**
 * GET /api/ops/retention-d7
 * 内部留存预览：按注册日 cohort，近似 D7（注册后第 6–8 天内有任意 product_events）占比。
 */
router.get('/retention-d7', async (_req, res: Response): Promise<void> => {
  const rows = await prisma.$queryRaw<
    { cohort_day: Date; registered: bigint; retained_d7: bigint }[]
  >(Prisma.sql`
    SELECT
      date_trunc('day', u."createdAt") AS cohort_day,
      COUNT(*)::bigint AS registered,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM product_events pe
          WHERE pe."userId" = u.id
            AND pe."createdAt" >= u."createdAt" + interval '6 days'
            AND pe."createdAt" < u."createdAt" + interval '8 days'
        )
      )::bigint AS retained_d7
    FROM users u
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 60
  `);

  res.json({
    success: true,
    data: rows.map((r) => {
      const reg = Number(r.registered);
      const ret = Number(r.retained_d7);
      return {
        cohortDay: r.cohort_day.toISOString().slice(0, 10),
        registered: reg,
        retainedD7: ret,
        rateApprox: reg > 0 ? Math.round((ret / reg) * 10000) / 10000 : 0,
      };
    }),
  });
});

/**
 * GET /api/ops/agent-recent-errors?limit=20
 * 最近失败的 Agent 任务（可读 errorMessage），供运维页排障
 */
router.get('/agent-recent-errors', async (req, res: Response): Promise<void> => {
  const raw = req.query.limit;
  const n = typeof raw === 'string' ? parseInt(raw, 10) : 20;
  const limit = Number.isFinite(n) ? Math.min(50, Math.max(1, n)) : 20;

  const tasks = await prisma.agentTask.findMany({
    where: { state: 'ERROR' },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      userId: true,
      taskType: true,
      agentType: true,
      state: true,
      errorMessage: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  res.json({ success: true, data: tasks });
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
