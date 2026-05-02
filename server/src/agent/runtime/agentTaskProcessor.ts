import { AgentTaskState, AgentTaskType, Prisma } from '@prisma/client';
import prisma from '../../shared/prisma';
import logger from '../../shared/logger';
import { formatErrorForStorage, serializeError } from '../../shared/serializeError';
import { aiService, GeneratePlanRequest } from '../../services/aiService';
import { ensureStructuredReviewSummary } from '../../services/aiSchemaGuard';
import { generateAIReviewSummary } from '../../services/aiReviewService';
import { analyzeAndSuggest } from '../../services/adaptiveService';

type PlanTaskInput = GeneratePlanRequest & {
  goalId: string;
};

function isPlanTaskInput(input: unknown): input is PlanTaskInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const data = input as Record<string, unknown>;
  return (
    typeof data.goalId === 'string' &&
    typeof data.goal === 'string' &&
    ['beginner', 'intermediate', 'advanced'].includes(String(data.currentLevel)) &&
    typeof data.hoursPerWeek === 'number' &&
    typeof data.durationWeeks === 'number'
  );
}

function parseReviewPeriod(input: Prisma.JsonValue): 'weekly' | 'monthly' | 'quarterly' {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return 'weekly';
  }
  const period = (input as Record<string, unknown>).period;
  if (period === 'monthly' || period === 'quarterly') {
    return period;
  }
  return 'weekly';
}

async function runPlanner(taskId: string, userId: string, input: Prisma.JsonValue): Promise<Prisma.JsonObject> {
  if (!isPlanTaskInput(input)) {
    throw new Error('PLAN_GENERATION 输入结构不合法');
  }

  const existingGoal = await prisma.goal.findFirst({
    where: {
      id: input.goalId,
      userId,
    },
  });
  if (!existingGoal) {
    throw new Error('目标不存在或无权限');
  }

  const planRequest: GeneratePlanRequest = {
    goal: input.goal,
    currentLevel: input.currentLevel,
    hoursPerWeek: input.hoursPerWeek,
    durationWeeks: input.durationWeeks,
    preferredStyle: input.preferredStyle,
    specificRequirements: input.specificRequirements,
  };

  const generatedPlan = await aiService.generateLearningPlan(planRequest);

  const plan = await prisma.plan.create({
    data: {
      goalId: input.goalId,
      userId,
      title: generatedPlan.title,
      durationWeeks: generatedPlan.durationWeeks,
      mermaidCode: generatedPlan.mermaidCode,
      content: JSON.stringify(generatedPlan.weeklyPlans),
    },
  });

  const tasks: Array<{
    planId: string;
    userId: string;
    title: string;
    week: number;
    day: number;
    completed: boolean;
  }> = [];
  for (const weekPlan of generatedPlan.weeklyPlans) {
    for (const task of weekPlan.tasks) {
      tasks.push({
        planId: plan.id,
        userId,
        title: task.title,
        week: weekPlan.week,
        day: task.day,
        completed: false,
      });
    }
  }
  if (tasks.length > 0) {
    await prisma.task.createMany({ data: tasks });
  }

  await prisma.agentTask.update({
    where: { id: taskId },
    data: { requestId: plan.id },
  });

  return {
    planId: plan.id,
    title: generatedPlan.title,
    durationWeeks: generatedPlan.durationWeeks,
    isFallback: Boolean(generatedPlan.isFallback),
    fallbackReason: generatedPlan.fallbackReason || null,
    weeklyPlanCount: generatedPlan.weeklyPlans.length,
  };
}

async function runReviewer(userId: string, input: Prisma.JsonValue): Promise<Prisma.JsonObject> {
  const period = parseReviewPeriod(input);
  const summary = ensureStructuredReviewSummary(await generateAIReviewSummary(userId, period));
  return {
    period,
    summary: summary.summary,
    highlights: summary.highlights,
    suggestions: summary.suggestions,
    isFallback: summary.isFallback,
  };
}

async function runAdaptive(userId: string, input: Prisma.JsonValue): Promise<Prisma.JsonObject> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('ADAPTIVE_ADJUSTMENT 输入结构不合法');
  }
  const planId = (input as Record<string, unknown>).planId;
  if (typeof planId !== 'string' || !planId.trim()) {
    throw new Error('ADAPTIVE_ADJUSTMENT 缺少 planId');
  }

  const suggestion = await analyzeAndSuggest(userId, planId);
  return {
    planId,
    suggestion: suggestion as unknown as Prisma.JsonValue,
  };
}

export async function processAgentTask(taskId: string): Promise<void> {
  const task = await prisma.agentTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      userId: true,
      taskType: true,
      state: true,
      input: true,
    },
  });
  if (!task) {
    logger.warn('Agent 任务不存在，跳过处理', { taskId });
    return;
  }

  const runningResult = await prisma.agentTask.updateMany({
    where: {
      id: taskId,
      state: AgentTaskState.UNINITIALIZED,
    },
    data: {
      state: AgentTaskState.RUNNING,
      startedAt: new Date(),
      endedAt: null,
      errorMessage: null,
    },
  });
  if (runningResult.count === 0) {
    return;
  }

  try {
    let output: Prisma.JsonObject;
    switch (task.taskType) {
      case AgentTaskType.PLAN_GENERATION:
        output = await runPlanner(task.id, task.userId, task.input);
        break;
      case AgentTaskType.REVIEW_SUMMARY:
        output = await runReviewer(task.userId, task.input);
        break;
      case AgentTaskType.ADAPTIVE_ADJUSTMENT:
        output = await runAdaptive(task.userId, task.input);
        break;
      default:
        throw new Error(`暂不支持的任务类型: ${task.taskType}`);
    }

    const current = await prisma.agentTask.findUnique({
      where: { id: taskId },
      select: { state: true },
    });
    if (!current || current.state === AgentTaskState.CANCELLED) {
      return;
    }

    await prisma.agentTask.updateMany({
      where: {
        id: taskId,
        state: AgentTaskState.RUNNING,
      },
      data: {
        state: AgentTaskState.COMPLETED,
        endedAt: new Date(),
        output,
      },
    });
  } catch (error) {
    const serialized = serializeError(error);
    logger.error('Agent Worker 执行失败', { taskId, ...serialized });
    await prisma.agentTask.updateMany({
      where: {
        id: taskId,
        state: AgentTaskState.RUNNING,
      },
      data: {
        state: AgentTaskState.ERROR,
        endedAt: new Date(),
        errorMessage: formatErrorForStorage(error),
      },
    });
  }
}
