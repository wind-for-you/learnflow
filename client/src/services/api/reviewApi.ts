import type { AIReviewSummary, Review } from '../../types';
import { api, unwrapResponse } from './http';

export const reviewApi = {
  getReviews: async (period?: 'weekly' | 'monthly' | 'quarterly'): Promise<{ reviews: Review[] }> => {
    const params = period ? { period } : undefined;
    const response = await api.get('/reviews', { params });
    const { data } = unwrapResponse<{ reviews: Review[] }>(response.data, (raw) => ({ reviews: raw.reviews || [] }));
    return data;
  },

  getReview: async (id: string): Promise<{ review: Review }> => {
    const response = await api.get(`/reviews/${id}`);
    const { data } = unwrapResponse<{ review: Review }>(response.data, (raw) => ({ review: raw.review }));
    return data;
  },

  createReview: async (data: { period: string; content: string }): Promise<{ review: Review; message: string }> => {
    const response = await api.post('/reviews', data);
    const parsed = unwrapResponse<{ review: Review }>(response.data, (raw) => ({ review: raw.review }));
    return { review: parsed.data.review, message: parsed.message || '复盘创建成功' };
  },

  updateReview: async (id: string, data: { content?: string; period?: string }): Promise<{ review: Review; message: string }> => {
    const response = await api.put(`/reviews/${id}`, data);
    const parsed = unwrapResponse<{ review: Review }>(response.data, (raw) => ({ review: raw.review }));
    return { review: parsed.data.review, message: parsed.message || '复盘更新成功' };
  },

  deleteReview: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/reviews/${id}`);
    const parsed = unwrapResponse<unknown>(response.data);
    return { message: parsed.message || '复盘删除成功' };
  },

  generateAISummary: async (period: 'weekly' | 'monthly' | 'quarterly'): Promise<AIReviewSummary> => {
    const response = await api.post('/reviews/ai-summary', { period });
    return unwrapResponse<AIReviewSummary>(response.data).data;
  },
};
