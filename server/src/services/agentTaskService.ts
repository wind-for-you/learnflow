import {
  AgentTask,
  AgentTaskState,
  AgentTaskType,
  AgentType,
  Prisma,
  ProviderType,
} from '@prisma/client';
import prisma from '../shared/prisma';
import { inMemoryAgentTaskQueue } from '../agent/runtime/inMemoryAgentTaskQueue';

export interface CreateAgentTaskInput {
  userId: string;
  taskType: AgentTaskType;
  agentType: AgentType;
  providerType?: ProviderType;
  input: Prisma.InputJsonValue;
}

class AgentTaskService {
  async createTask(input: CreateAgentTaskInput): Promise<AgentTask> {
    const task = await prisma.agentTask.create({
      data: {
        userId: input.userId,
        taskType: input.taskType,
        agentType: input.agentType,
        providerType: input.providerType ?? ProviderType.DASHSCOPE,
        input: input.input,
        state: AgentTaskState.UNINITIALIZED,
      },
    });

    await inMemoryAgentTaskQueue.enqueue(task.id);
    return task;
  }

  async getTaskByIdForUser(taskId: string, userId: string): Promise<AgentTask | null> {
    return prisma.agentTask.findFirst({
      where: { id: taskId, userId },
    });
  }

  async cancelTask(taskId: string, userId: string): Promise<AgentTask | null> {
    const task = await this.getTaskByIdForUser(taskId, userId);
    if (!task) {
      return null;
    }

    if (task.state === AgentTaskState.COMPLETED || task.state === AgentTaskState.ERROR) {
      return task;
    }

    const updated = await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        state: AgentTaskState.CANCELLED,
        endedAt: new Date(),
        errorMessage: task.errorMessage || '任务已取消',
      },
    });
    await inMemoryAgentTaskQueue.cancel(taskId);
    return updated;
  }

  async retryTask(taskId: string, userId: string): Promise<AgentTask | null> {
    const task = await this.getTaskByIdForUser(taskId, userId);
    if (!task) {
      return null;
    }

    if (![AgentTaskState.ERROR, AgentTaskState.CANCELLED].includes(task.state)) {
      return task;
    }

    const resetTask = await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        state: AgentTaskState.UNINITIALIZED,
        startedAt: null,
        endedAt: null,
        errorMessage: null,
        requestId: null,
        output: null,
      },
    });

    await inMemoryAgentTaskQueue.retry(resetTask.id);
    return resetTask;
  }
}

export const agentTaskService = new AgentTaskService();
