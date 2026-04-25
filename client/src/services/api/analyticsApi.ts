import type { AnalyticsOverview, WeeklyReport } from '../../types';
import { api, unwrapResponse } from './http';

export const analyticsApi = {
  getOverview: async (range: '7d' | '30d' | '90d' = '7d'): Promise<AnalyticsOverview> => {
    const response = await api.get('/analytics/overview', { params: { range } });
    return unwrapResponse<AnalyticsOverview>(response.data).data;
  },

  getWeeklyReport: async (): Promise<WeeklyReport> => {
    const response = await api.get('/analytics/weekly-report');
    return unwrapResponse<WeeklyReport>(response.data).data;
  },
};
