import { Queue } from 'bullmq';
import IORedis from 'ioredis';

type AgentTaskJob = {
  taskId: string;
};

const QUEUE_NAME = 'learnflow-agent-tasks';
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const globalBullmq = globalThis as typeof globalThis & {
  __learnflowAgentQueue?: Queue<AgentTaskJob>;
  __learnflowAgentRedis?: IORedis;
};

const redisConnection =
  globalBullmq.__learnflowAgentRedis ??
  new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
globalBullmq.__learnflowAgentRedis = redisConnection;

const queue =
  globalBullmq.__learnflowAgentQueue ??
  new Queue<AgentTaskJob>(QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  });
globalBullmq.__learnflowAgentQueue = queue;

class InMemoryAgentTaskQueue {
  async enqueue(taskId: string): Promise<void> {
    await queue.add('agent-task', { taskId });
  }

  async cancel(taskId: string): Promise<void> {
    const jobs = await queue.getJobs(['waiting', 'delayed', 'prioritized', 'paused']);
    for (const job of jobs) {
      if (job.data.taskId === taskId) {
        await job.remove().catch(() => undefined);
      }
    }
  }

  async retry(taskId: string): Promise<void> {
    await this.cancel(taskId);
    await this.enqueue(taskId);
  }
}

export const inMemoryAgentTaskQueue = new InMemoryAgentTaskQueue();
export const agentTaskQueueName = QUEUE_NAME;
export const agentTaskRedisConnection = redisConnection;
