import { Router, Response } from 'express';
import { Role } from '@prisma/client';
import { body, param, query, validationResult } from 'express-validator';
import { AuthenticatedRequest, requireAdmin, requireAuth } from '../middleware/auth';
import prisma from '../shared/prisma';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  '/overview',
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const [users, goals, plans, tasks, agentTasks] = await Promise.all([
      prisma.user.count(),
      prisma.goal.count(),
      prisma.plan.count(),
      prisma.task.count(),
      prisma.agentTask.count(),
    ]);

    res.json({
      success: true,
      data: {
        users,
        goals,
        plans,
        tasks,
        agentTasks,
      },
    });
  },
);

router.get(
  '/users',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('role').optional().isIn([Role.USER, Role.ADMIN]),
    query('isActive').optional().isBoolean().withMessage('isActive 必须是布尔值'),
    query('sortBy').optional().isIn(['createdAt', 'name', 'email', 'role']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation Error', details: errors.array() });
      return;
    }

    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const role = req.query.role as Role | undefined;
    const isActiveQuery = req.query.isActive as string | undefined;
    const isActive =
      isActiveQuery === undefined ? undefined : isActiveQuery === 'true';
    const sortBy = (req.query.sortBy as 'createdAt' | 'name' | 'email' | 'role' | undefined) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc' | undefined) || 'desc';

    const where = {
      ...(role ? { role } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { name: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          avatar: true,
          createdAt: true,
          _count: {
            select: {
              goals: true,
              plans: true,
              tasks: true,
              agentTasks: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    });
  },
);

function buildCsvLine(values: Array<string | number | boolean | null | undefined>): string {
  const escaped = values.map((item) => {
    const text = item === null || item === undefined ? '' : String(item);
    const doubled = text.replace(/"/g, '""');
    return `"${doubled}"`;
  });
  return `${escaped.join(',')}\n`;
}

router.patch(
  '/users/:userId/role',
  [
    param('userId').isString().notEmpty(),
    body('role').isIn([Role.USER, Role.ADMIN]).withMessage('role 只能是 USER 或 ADMIN'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation Error', details: errors.array() });
      return;
    }

    const actorId = req.user!.id;
    const userId = req.params.userId as string;
    const role = req.body.role as Role;

    if (actorId === userId && role !== Role.ADMIN) {
      res.status(400).json({
        error: 'Bad Request',
        message: '不能将自己降级为非管理员',
      });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true, name: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: '用户不存在' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'admin.user.role.updated',
        targetType: 'user',
        targetId: userId,
        metadata: {
          fromRole: existing.role,
          toRole: role,
          email: existing.email,
        },
      },
    });

    res.json({
      success: true,
      message: '用户角色更新成功',
      data: { user: updated },
    });
  },
);

router.get(
  '/audit-logs',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('action').optional().isString(),
    query('startAt').optional().isISO8601().withMessage('startAt 必须是 ISO 日期'),
    query('endAt').optional().isISO8601().withMessage('endAt 必须是 ISO 日期'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation Error', details: errors.array() });
      return;
    }

    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const skip = (page - 1) * limit;
    const action = (req.query.action as string) || '';
    const startAt = req.query.startAt as string | undefined;
    const endAt = req.query.endAt as string | undefined;

    const where = {
      ...(action ? { action: { contains: action, mode: 'insensitive' as const } } : {}),
      ...((startAt || endAt)
        ? {
            createdAt: {
              ...(startAt ? { gte: new Date(startAt) } : {}),
              ...(endAt ? { lte: new Date(endAt) } : {}),
            },
          }
        : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    });
  },
);

router.get(
  '/audit-logs/export',
  [
    query('action').optional().isString(),
    query('startAt').optional().isISO8601().withMessage('startAt 必须是 ISO 日期'),
    query('endAt').optional().isISO8601().withMessage('endAt 必须是 ISO 日期'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation Error', details: errors.array() });
      return;
    }

    const action = (req.query.action as string) || '';
    const startAt = req.query.startAt as string | undefined;
    const endAt = req.query.endAt as string | undefined;

    const where = {
      ...(action ? { action: { contains: action, mode: 'insensitive' as const } } : {}),
      ...((startAt || endAt)
        ? {
            createdAt: {
              ...(startAt ? { gte: new Date(startAt) } : {}),
              ...(endAt ? { lte: new Date(endAt) } : {}),
            },
          }
        : {}),
    };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    let csv = buildCsvLine(['id', 'action', 'targetType', 'targetId', 'actorId', 'actorEmail', 'actorName', 'actorRole', 'createdAt', 'metadata']);
    for (const log of logs) {
      csv += buildCsvLine([
        log.id,
        log.action,
        log.targetType,
        log.targetId || '',
        log.actor.id,
        log.actor.email,
        log.actor.name,
        log.actor.role,
        log.createdAt.toISOString(),
        log.metadata ? JSON.stringify(log.metadata) : '',
      ]);
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(`\uFEFF${csv}`);
  },
);

router.patch(
  '/users/:userId/status',
  [
    param('userId').isString().notEmpty(),
    body('isActive').isBoolean().withMessage('isActive 必须是布尔值'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation Error', details: errors.array() });
      return;
    }

    const actorId = req.user!.id;
    const userId = req.params.userId as string;
    const isActive = Boolean(req.body.isActive);

    if (actorId === userId && !isActive) {
      res.status(400).json({
        error: 'Bad Request',
        message: '不能停用自己的账号',
      });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, isActive: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: '用户不存在' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'admin.user.status.updated',
        targetType: 'user',
        targetId: userId,
        metadata: {
          from: existing.isActive,
          to: isActive,
          email: existing.email,
        },
      },
    });

    res.json({
      success: true,
      message: isActive ? '账号已启用' : '账号已停用',
      data: { user: updated },
    });
  },
);

export default router;
