import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { VideoResourceType } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../shared/prisma';
import { parseAndValidateHttpsEmbedUrl } from '../shared/embedUrlWhitelist';

const router = Router();
router.use(requireAuth);

type ParentRef = { goalId: string | null; planId: string | null; taskId: string | null };

async function resolveParentForUser(
  userId: string,
  body: { taskId?: string; planId?: string; goalId?: string },
): Promise<{ ok: true; parent: ParentRef } | { ok: false; status: number; message: string }> {
  const { taskId, planId, goalId } = body;
  const count = [taskId, planId, goalId].filter(Boolean).length;
  if (count === 0) {
    return { ok: false, status: 400, message: '请至少关联 taskId、planId、goalId 之一' };
  }
  if (count > 1) {
    return { ok: false, status: 400, message: '请只传一个关联：taskId、planId 或 goalId' };
  }

  if (taskId) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
      include: { plan: { select: { id: true, goalId: true } } },
    });
    if (!task) {
      return { ok: false, status: 404, message: '任务不存在' };
    }
    return {
      ok: true,
      parent: { taskId: task.id, planId: task.planId, goalId: task.plan.goalId },
    };
  }

  if (planId) {
    const plan = await prisma.plan.findFirst({
      where: { id: planId, userId },
      select: { id: true, goalId: true },
    });
    if (!plan) {
      return { ok: false, status: 404, message: '计划不存在' };
    }
    return { ok: true, parent: { taskId: null, planId: plan.id, goalId: plan.goalId } };
  }

  const gId = goalId as string;
  const goal = await prisma.goal.findFirst({
    where: { id: gId, userId },
    select: { id: true },
  });
  if (!goal) {
    return { ok: false, status: 404, message: '目标不存在' };
  }
  return { ok: true, parent: { taskId: null, planId: null, goalId: goal.id } };
}

async function assertVideoOwned(userId: string, id: string) {
  return prisma.videoResource.findFirst({
    where: { id, userId },
  });
}

/**
 * GET /api/video-resources?taskId= / ?planId= / ?goalId=
 */
router.get(
  '/',
  [
    query('taskId').optional().isString(),
    query('planId').optional().isString(),
    query('goalId').optional().isString(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation Error', details: errors.array() });
        return;
      }
      const userId = req.user!.id;
      const { taskId, planId, goalId } = req.query as Record<string, string | undefined>;
      const n = [taskId, planId, goalId].filter(Boolean).length;
      if (n !== 1) {
        res.status(400).json({ error: 'Bad Request', message: '请只传 taskId、planId 或 goalId 之一作为筛选' });
        return;
      }

      const where =
        taskId != null
          ? { userId, taskId }
          : planId != null
            ? { userId, planId }
            : { userId, goalId };

      const videos = await prisma.videoResource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      res.json({ videos });
    } catch (e) {
      console.error('list video resources', e);
      res.status(500).json({ error: 'Server Error', message: '获取视频列表失败' });
    }
  },
);

/**
 * GET /api/video-resources/:id
 */
router.get('/:id', [param('id').isString().notEmpty()], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation Error', details: errors.array() });
      return;
    }
    const userId = req.user!.id;
    const row = await assertVideoOwned(userId, req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Not Found', message: '资源不存在' });
      return;
    }
    res.json({ video: row });
  } catch (e) {
    console.error('get video resource', e);
    res.status(500).json({ error: 'Server Error', message: '获取视频失败' });
  }
});

/**
 * POST /api/video-resources
 */
router.post(
  '/',
  [
    body('url').isString().trim().notEmpty().withMessage('url 必填'),
    body('title').optional().isString().isLength({ max: 200 }),
    body('taskId').optional().isString(),
    body('planId').optional().isString(),
    body('goalId').optional().isString(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation Error', details: errors.array() });
        return;
      }
      const userId = req.user!.id;
      const parsed = parseAndValidateHttpsEmbedUrl(req.body.url as string);
      if (!parsed.ok) {
        const msg =
          parsed.error === 'DOMAIN_NOT_ALLOWED'
            ? '仅支持来自已审核域名的视频链接（哔哩哔哩、YouTube、Vimeo）'
            : parsed.error === 'HTTPS_REQUIRED'
              ? '仅支持 https 链接'
              : '链接格式无效';
        res.status(400).json({ error: 'Bad Request', message: msg, code: parsed.error });
        return;
      }

      const parent = await resolveParentForUser(userId, req.body);
      if (!parent.ok) {
        res.status(parent.status).json({ error: 'Bad Request', message: parent.message });
        return;
      }

      const video = await prisma.videoResource.create({
        data: {
          userId,
          type: VideoResourceType.EMBED,
          url: parsed.url.toString(),
          title: (req.body.title as string | undefined)?.trim() || null,
          goalId: parent.parent.goalId,
          planId: parent.parent.planId,
          taskId: parent.parent.taskId,
        },
      });
      res.status(201).json({ message: '已添加', video });
    } catch (e) {
      console.error('create video resource', e);
      res.status(500).json({ error: 'Server Error', message: '创建失败' });
    }
  },
);

/**
 * PUT /api/video-resources/:id
 */
router.put(
  '/:id',
  [
    param('id').isString().notEmpty(),
    body('url').optional().isString().trim().notEmpty(),
    body('title').optional().isString().isLength({ max: 200 }),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation Error', details: errors.array() });
        return;
      }
      const userId = req.user!.id;
      const existing = await assertVideoOwned(userId, req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Not Found', message: '资源不存在' });
        return;
      }

      const data: { url?: string; title?: string | null } = {};
      if (req.body.url != null) {
        const parsed = parseAndValidateHttpsEmbedUrl(req.body.url as string);
        if (!parsed.ok) {
          const msg =
            parsed.error === 'DOMAIN_NOT_ALLOWED'
              ? '仅支持来自已审核域名的视频链接（哔哩哔哩、YouTube、Vimeo）'
              : parsed.error === 'HTTPS_REQUIRED'
                ? '仅支持 https 链接'
                : '链接格式无效';
          res.status(400).json({ error: 'Bad Request', message: msg, code: parsed.error });
          return;
        }
        data.url = parsed.url.toString();
      }
      if (req.body.title !== undefined) {
        data.title = String(req.body.title).trim() || null;
      }

      const video = await prisma.videoResource.update({
        where: { id: existing.id },
        data,
      });
      res.json({ message: '已更新', video });
    } catch (e) {
      console.error('update video resource', e);
      res.status(500).json({ error: 'Server Error', message: '更新失败' });
    }
  },
);

/**
 * DELETE /api/video-resources/:id
 */
router.delete('/:id', [param('id').isString().notEmpty()], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation Error', details: errors.array() });
      return;
    }
    const userId = req.user!.id;
    const existing = await assertVideoOwned(userId, req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: '资源不存在' });
      return;
    }
    await prisma.videoResource.delete({ where: { id: existing.id } });
    res.json({ message: '已删除' });
  } catch (e) {
    console.error('delete video resource', e);
    res.status(500).json({ error: 'Server Error', message: '删除失败' });
  }
});

export default router;
