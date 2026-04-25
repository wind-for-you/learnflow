import { Router, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { grayReleaseGuard } from '../middleware/grayRelease';
import prisma from '../shared/prisma';
import { generateAIReviewSummary } from '../services/aiReviewService';
import { ensureStructuredReviewSummary } from '../services/aiSchemaGuard';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/analytics/overview
 */
router.get(
  '/overview',
  grayReleaseGuard,
  [query('range').optional().isIn(['7d', '30d', '90d'])],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation Error', details: errors.array() });
        return;
      }

      const userId = req.user!.id;
      const range = (req.query.range as '7d' | '30d' | '90d') || '7d';
      const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
      const from = new Date();
      from.setDate(from.getDate() - days);

      const [checkins, tasks] = await Promise.all([
        prisma.checkin.findMany({
          where: { userId, date: { gte: from } },
          select: { date: true, duration: true },
        }),
        prisma.task.findMany({
          where: { userId, updatedAt: { gte: from } },
          select: { completed: true },
        }),
      ]);

      const activeDays = new Set(checkins.map((c) => c.date.toISOString().slice(0, 10))).size;
      const studyMinutes = checkins.reduce((sum, c) => sum + c.duration, 0);
      const completionRate =
        tasks.length > 0
          ? Number((tasks.filter((t) => t.completed).length / tasks.length).toFixed(2))
          : 0;

      const sorted = [...checkins]
        .map((c) => c.date.toISOString().slice(0, 10))
        .sort()
        .reverse();
      let streak = 0;
      let cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      for (let i = 0; i < sorted.length; i++) {
        const current = new Date(cursor);
        current.setDate(cursor.getDate() - i);
        const key = current.toISOString().slice(0, 10);
        if (sorted.includes(key)) {
          streak += 1;
        } else {
          break;
        }
      }

      res.json({
        success: true,
        data: {
          activeDays,
          completionRate,
          studyMinutes,
          streak,
        },
      });
    } catch (error) {
      console.error('获取 analytics overview 失败:', error);
      res.status(500).json({ error: 'Server Error', message: '获取 analytics overview 失败' });
    }
  },
);

/**
 * GET /api/analytics/weekly-report
 */
router.get('/weekly-report', grayReleaseGuard, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const from = new Date();
    from.setDate(from.getDate() - 7);

    const [checkins, tasks, aiSummary] = await Promise.all([
      prisma.checkin.findMany({
        where: { userId, date: { gte: from } },
        select: { date: true, duration: true, rating: true },
      }),
      prisma.task.findMany({
        where: { userId, updatedAt: { gte: from } },
        select: { completed: true },
      }),
      generateAIReviewSummary(userId, 'weekly'),
    ]);

    const totalMinutes = checkins.reduce((sum, c) => sum + c.duration, 0);
    const avgRatingRaw =
      checkins.filter((c) => typeof c.rating === 'number').reduce((sum, c) => sum + (c.rating || 0), 0) /
      (checkins.filter((c) => typeof c.rating === 'number').length || 1);
    const completionRate =
      tasks.length > 0
        ? Number((tasks.filter((t) => t.completed).length / tasks.length).toFixed(2))
        : 0;

    res.json({
      success: true,
      data: {
        period: 'weekly',
        metrics: {
          totalMinutes,
          totalCheckins: checkins.length,
          averageRating: Number(avgRatingRaw.toFixed(2)),
          completionRate,
        },
        aiSummary: ensureStructuredReviewSummary(aiSummary),
      },
    });
  } catch (error) {
    console.error('获取 weekly-report 失败:', error);
    res.status(500).json({ error: 'Server Error', message: '获取 weekly-report 失败' });
  }
});

export default router;
