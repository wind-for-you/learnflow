import type { Goal, GoalFormData, GoalStats } from '../../types';
import { api, unwrapResponse } from './http';

export const goalApi = {
  getGoals: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    goals: Goal[];
    pagination: any;
  }> => {
    const response = await api.get('/goals', { params });
    const { data } = unwrapResponse<{ goals: Goal[]; pagination: any }>(
      response.data,
      (raw) => ({ goals: raw.goals || [], pagination: raw.pagination }),
    );
    return data;
  },

  getGoal: async (id: string): Promise<{ goal: Goal }> => {
    const response = await api.get(`/goals/${id}`);
    const { data } = unwrapResponse<{ goal: Goal }>(response.data, (raw) => ({ goal: raw.goal }));
    return data;
  },

  createGoal: async (data: GoalFormData): Promise<{ goal: Goal; message: string }> => {
    const response = await api.post('/goals', data);
    const parsed = unwrapResponse<{ goal: Goal }>(response.data, (raw) => ({ goal: raw.goal }));
    return { goal: parsed.data.goal, message: parsed.message || '目标创建成功' };
  },

  updateGoal: async (
    id: string,
    data: Partial<GoalFormData> & { status?: string; progress?: number },
  ): Promise<{ goal: Goal; message: string }> => {
    const response = await api.put(`/goals/${id}`, data);
    const parsed = unwrapResponse<{ goal: Goal }>(response.data, (raw) => ({ goal: raw.goal }));
    return { goal: parsed.data.goal, message: parsed.message || '目标更新成功' };
  },

  deleteGoal: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/goals/${id}`);
    const parsed = unwrapResponse<unknown>(response.data);
    return { message: parsed.message || '目标删除成功' };
  },

  getGoalStats: async (id: string): Promise<{ stats: GoalStats }> => {
    const response = await api.get(`/goals/${id}/stats`);
    const { data } = unwrapResponse<{ stats: GoalStats }>(response.data, (raw) => ({ stats: raw.stats }));
    return data;
  },
};
