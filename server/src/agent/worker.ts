import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import logger from '../shared/logger';
import { serializeError } from '../shared/serializeError';
import prisma from '../shared/prisma';
import {
  agentTaskQueueName,
  agentTaskRedisConnection,
} from './runtime/inMemoryAgentTaskQueue';
import { processAgentTask } from './runtime/agentTaskProcessor';

dotenv.config();

const worker = new Worker<{ taskId: string }>(
  agentTaskQueueName,
  async (job) => {
    await processAgentTask(job.data.taskId);
  },
  {
    connection: agentTaskRedisConnection,
    concurrency: parseInt(process.env.AGENT_WORKER_CONCURRENCY || '4', 10),
  }
);

worker.on('ready', () => {
  logger.info(`Agent Worker 已启动，队列: ${agentTaskQueueName}`);
});

worker.on('completed', (job) => {
  logger.info('Agent Worker 完成任务', { jobId: job.id, taskId: job.data.taskId });
});

worker.on('failed', (job, err) => {
  const serialized = serializeError(err);
  logger.error('Agent Worker 任务失败', {
    jobId: job?.id,
    taskId: job?.data?.taskId,
    ...serialized,
  });
});

async function gracefulShutdown(signal: string) {
  logger.info(`Agent Worker 收到 ${signal}，开始关闭...`);
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
