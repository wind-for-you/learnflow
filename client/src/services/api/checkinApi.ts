import type { Checkin, CheckinFormData, CheckinStats } from '../../types';
import { api, unwrapResponse } from './http';

export const checkinApi = {
  getCheckins: async (params?: {
    startDate?: string;
    endDate?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    checkins: Checkin[];
    pagination: any;
  }> => {
    const response = await api.get('/checkins', { params });
    const { data } = unwrapResponse<{ checkins: Checkin[]; pagination: any }>(
      response.data,
      (raw) => ({ checkins: raw.checkins || [], pagination: raw.pagination }),
    );
    return data;
  },

  getTodayCheckin: async (): Promise<{
    checkin?: Checkin;
    hasCheckedIn: boolean;
  }> => {
    const response = await api.get('/checkins/today');
    return unwrapResponse<any>(response.data).data;
  },

  createCheckin: async (data: CheckinFormData): Promise<{ checkin: Checkin; message: string }> => {
    const response = await api.post('/checkins', data);
    const parsed = unwrapResponse<{ checkin: Checkin }>(response.data, (raw) => ({ checkin: raw.checkin }));
    return { checkin: parsed.data.checkin, message: parsed.message || '打卡成功' };
  },

  updateCheckin: async (
    id: string,
    data: Partial<CheckinFormData>,
  ): Promise<{ checkin: Checkin; message: string }> => {
    const response = await api.put(`/checkins/${id}`, data);
    const parsed = unwrapResponse<{ checkin: Checkin }>(response.data, (raw) => ({ checkin: raw.checkin }));
    return { checkin: parsed.data.checkin, message: parsed.message || '打卡记录更新成功' };
  },

  deleteCheckin: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/checkins/${id}`);
    const parsed = unwrapResponse<unknown>(response.data);
    return { message: parsed.message || '打卡记录删除成功' };
  },

  getCheckinStats: async (period?: 'week' | 'month' | 'year'): Promise<CheckinStats> => {
    const params = period ? { period } : undefined;
    const response = await api.get('/checkins/stats', { params });
    return unwrapResponse<CheckinStats>(response.data).data;
  },

  getCalendarData: async (
    year: number,
    month: number,
  ): Promise<{
    year: number;
    month: number;
    calendarData: Record<number, any>;
    summary: {
      totalDays: number;
      totalMinutes: number;
      completionRate: number;
    };
  }> => {
    const response = await api.get(`/checkins/calendar/${year}/${month}`);
    return unwrapResponse<any>(response.data).data;
  },
};
