import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { AgentTaskState, AgentTaskType, AgentType, ProviderType } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { agentTaskService } from '../services/agentTaskService';
import prisma from '../shared/prisma';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  [
    body('taskType')
      .isIn(Object.values(AgentTaskType))
      .withMessage(`taskType 必须是: ${Object.values(AgentTaskType).join(', ')}`),
    body('agentType')
      .isIn(Object.values(AgentType))
      .withMessage(`agentType 必须是: ${Object.values(AgentType).join(', ')}`),
    body('providerType')
      .optional()
      .isIn(Object.values(ProviderType))
      .withMessage(`providerType 必须是: ${Object.values(ProviderType).join(', ')}`),
    body('input').isObject().withMessage('input 必须是对象'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation Error',
        details: errors.array(),
      });
      return;
    }

    const task = await agentTaskService.createTask({
      userId: req.user!.id,
      taskType: req.body.taskType as AgentTaskType,
      agentType: req.body.agentType as AgentType,
      providerType: req.body.providerType as ProviderType | undefined,
      input: req.body.input,
    });

    res.status(202).json({
      message: 'Agent 任务已创建并进入队列',
      task,
    });
  }
);

router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const tasks = await prisma.agentTask.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ tasks });
  }
);

router.get(
  '/:taskId',
  [param('taskId').isString().notEmpty().withMessage('taskId 不能为空')],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation Error',
        details: errors.array(),
      });
      return;
    }

    const task = await agentTaskService.getTaskByIdForUser(req.params.taskId, req.user!.id);
    if (!task) {
      res.status(404).json({
        error: 'Not Found',
        message: '任务不存在',
      });
      return;
    }

    res.json({ task });
  }
);

router.patch(
  '/:taskId/cancel',
  [param('taskId').isString().notEmpty().withMessage('taskId 不能为空')],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation Error',
        details: errors.array(),
      });
      return;
    }

    const task = await agentTaskService.cancelTask(req.params.taskId, req.user!.id);
    if (!task) {
      res.status(404).json({
        error: 'Not Found',
        message: '任务不存在',
      });
      return;
    }

    res.json({
      message:
        task.state === AgentTaskState.CANCELLED ? '任务已取消' : '当前状态不支持取消，已返回原任务状态',
      task,
    });
  }
);

router.post(
  '/:taskId/retry',
  [param('taskId').isString().notEmpty().withMessage('taskId 不能为空')],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation Error',
        details: errors.array(),
      });
      return;
    }

    const task = await agentTaskService.retryTask(req.params.taskId, req.user!.id);
    if (!task) {
      res.status(404).json({
        error: 'Not Found',
        message: '任务不存在',
      });
      return;
    }

    res.json({
      message:
        task.state === AgentTaskState.UNINITIALIZED
          ? '任务已重试并重新入队'
          : '当前状态不支持重试，已返回原任务状态',
      task,
    });
  }
);

export default router;
