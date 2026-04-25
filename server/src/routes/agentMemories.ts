import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../shared/prisma';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const memories = await prisma.agentMemory.findMany({
      where: { userId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ memories });
  } catch (error) {
    console.error('获取 Agent 记忆失败:', error);
    res.status(500).json({ error: 'Server Error', message: '获取 Agent 记忆失败' });
  }
});

router.get(
  '/:key',
  [param('key').isString().notEmpty().withMessage('key 不能为空')],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation Error', details: errors.array() });
      return;
    }
    const memory = await prisma.agentMemory.findUnique({
      where: {
        userId_key: {
          userId: req.user!.id,
          key: req.params.key,
        },
      },
    });
    if (!memory) {
      res.status(404).json({ error: 'Not Found', message: '记忆不存在' });
      return;
    }
    res.json({ memory });
  }
);

router.put(
  '/:key',
  [
    param('key').isString().notEmpty().withMessage('key 不能为空'),
    body('value').exists().withMessage('value 不能为空'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation Error', details: errors.array() });
      return;
    }

    const memory = await prisma.agentMemory.upsert({
      where: {
        userId_key: {
          userId: req.user!.id,
          key: req.params.key,
        },
      },
      update: {
        value: req.body.value,
      },
      create: {
        userId: req.user!.id,
        key: req.params.key,
        value: req.body.value,
      },
    });

    res.json({ message: '记忆保存成功', memory });
  }
);

router.delete(
  '/:key',
  [param('key').isString().notEmpty().withMessage('key 不能为空')],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation Error', details: errors.array() });
      return;
    }

    const memory = await prisma.agentMemory.findUnique({
      where: {
        userId_key: {
          userId: req.user!.id,
          key: req.params.key,
        },
      },
    });
    if (!memory) {
      res.status(404).json({ error: 'Not Found', message: '记忆不存在' });
      return;
    }

    await prisma.agentMemory.delete({
      where: {
        userId_key: {
          userId: req.user!.id,
          key: req.params.key,
        },
      },
    });

    res.json({ message: '记忆删除成功' });
  }
);

export default router;
