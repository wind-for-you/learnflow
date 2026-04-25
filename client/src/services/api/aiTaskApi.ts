import { api, unwrapResponse } from './http';

export const aiTaskApi = {
  getCompletions: async (planId: string): Promise<{
    success: boolean;
    completions: Record<string, boolean>;
  }> => {
    const response = await api.get(`/ai-tasks/${planId}`);
    const { data } = unwrapResponse<any>(response.data, (raw) => ({
      success: raw.success,
      completions: raw.completions,
    }));
    return data;
  },

  updateCompletion: async (
    planId: string,
    taskKey: string,
    completed: boolean,
  ): Promise<{
    success: boolean;
    completion: any;
    message: string;
  }> => {
    const response = await api.put(`/ai-tasks/${planId}/${taskKey}`, { completed });
    return unwrapResponse<any>(response.data).data;
  },

  batchUpdateCompletions: async (
    planId: string,
    completions: Record<string, boolean>,
  ): Promise<{
    success: boolean;
    message: string;
  }> => {
    const response = await api.put(`/ai-tasks/${planId}/batch`, { completions });
    return unwrapResponse<any>(response.data).data;
  },
};
