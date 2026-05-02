import type { AgentRecentErrorRow, OpsSystemOverview } from '../../types';
import { api, unwrapResponse } from './http';

export const opsApi = {
  getSystemOverview: async (): Promise<OpsSystemOverview> => {
    const response = await api.get('/ops/system-overview');
    return unwrapResponse<OpsSystemOverview>(response.data, (raw) => raw).data;
  },

  getRetentionD7: async (): Promise<
    Array<{
      cohortDay: string;
      registered: number;
      retainedD7: number;
      rateApprox: number;
    }>
  > => {
    const response = await api.get('/ops/retention-d7');
    return unwrapResponse<
      Array<{
        cohortDay: string;
        registered: number;
        retainedD7: number;
        rateApprox: number;
      }>
    >(response.data, (raw) => raw).data;
  },

  getAgentRecentErrors: async (limit = 20): Promise<AgentRecentErrorRow[]> => {
    const response = await api.get('/ops/agent-recent-errors', { params: { limit } });
    return unwrapResponse<AgentRecentErrorRow[]>(response.data).data;
  },

  getQueueMetrics: async (): Promise<{
    queue: Record<string, number>;
    dbTaskState: Array<{ state: string; count: number }>;
  }> => {
    const response = await api.get('/ops/queue-metrics');
    return unwrapResponse<{
      queue: Record<string, number>;
      dbTaskState: Array<{ state: string; count: number }>;
    }>(response.data, (raw) => raw).data;
  },
};
