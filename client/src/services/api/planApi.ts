import type { GeneratePlanRequest, Plan } from '../../types';
import { api, unwrapResponse } from './http';

export const planApi = {
  getPlans: async (goalId?: string): Promise<{ plans: Plan[] }> => {
    const params = goalId ? { goalId } : undefined;
    const response = await api.get('/plans', { params });
    const { data } = unwrapResponse<{ plans: Plan[] }>(response.data, (raw) => ({ plans: raw.plans || [] }));
    return data;
  },

  getPlan: async (id: string): Promise<{ plan: Plan }> => {
    const response = await api.get(`/plans/${id}`);
    const { data } = unwrapResponse<{ plan: Plan }>(response.data, (raw) => ({ plan: raw.plan }));
    return data;
  },

  generatePlan: async (data: GeneratePlanRequest): Promise<{ plan: Plan; message: string }> => {
    // MiMo 等推理模型生成完整计划常需 60–90s，需高于默认 30s
    const response = await api.post('/plans/generate', data, { timeout: 120000 });
    const parsed = unwrapResponse<{ plan: Plan }>(response.data, (raw) => ({ plan: raw.plan }));
    return { plan: parsed.data.plan, message: parsed.message || '学习计划生成成功' };
  },

  updatePlan: async (
    id: string,
    data: { title?: string; mermaidCode?: string },
  ): Promise<{ plan: Plan; message: string }> => {
    const response = await api.patch(`/plans/${id}`, data);
    const parsed = unwrapResponse<{ plan: Plan }>(response.data, (raw) => ({ plan: raw.plan }));
    return { plan: parsed.data.plan, message: parsed.message || '计划更新成功' };
  },

  deletePlan: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/plans/${id}`);
    const parsed = unwrapResponse<unknown>(response.data);
    return { message: parsed.message || '计划删除成功' };
  },
};
