import type { AgentTask } from '../../types';
import { api, unwrapResponse } from './http';

export const agentTaskApi = {
  list: async (): Promise<AgentTask[]> => {
    const response = await api.get('/agent-tasks');
    return unwrapResponse<AgentTask[]>(response.data, (raw) => raw.tasks || []).data;
  },

  getById: async (taskId: string): Promise<AgentTask> => {
    const response = await api.get(`/agent-tasks/${taskId}`);
    return unwrapResponse<AgentTask>(response.data, (raw) => raw.task).data;
  },

  cancel: async (taskId: string): Promise<AgentTask> => {
    const response = await api.patch(`/agent-tasks/${taskId}/cancel`);
    return unwrapResponse<AgentTask>(response.data, (raw) => raw.task).data;
  },

  retry: async (taskId: string): Promise<AgentTask> => {
    const response = await api.post(`/agent-tasks/${taskId}/retry`);
    return unwrapResponse<AgentTask>(response.data, (raw) => raw.task).data;
  },
};
