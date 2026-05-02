import type { AnalyticsOverview, WeeklyReport } from '../../types';
import {
  readWeeklyReportCache,
  writeWeeklyReportCache,
  clearWeeklyReportCache,
} from '../../utils/weeklyReportCache';
import { api, unwrapResponse } from './http';

export type GetWeeklyReportOptions = {
  /** 当前登录用户 id，用于按人+按自然日缓存；不传则不读写缓存 */
  userId?: string;
  /** 为 true 时跳过读缓存（仍会写入缓存） */
  bypassCache?: boolean;
};

export const analyticsApi = {
  getOverview: async (range: '7d' | '30d' | '90d' = '7d'): Promise<AnalyticsOverview> => {
    const response = await api.get('/analytics/overview', { params: { range } });
    return unwrapResponse<AnalyticsOverview>(response.data).data;
  },

  /**
   * 含 AI 生成；默认按「用户 + 本地当天」读 localStorage，命中则不请求接口以控成本。
   * 主动刷新请用 refreshWeeklyReport。
   */
  getWeeklyReport: async (options?: GetWeeklyReportOptions): Promise<WeeklyReport> => {
    const userId = options?.userId;
    if (userId && !options?.bypassCache) {
      const cached = readWeeklyReportCache(userId);
      if (cached) {
        return cached;
      }
    }
    const response = await api.get('/analytics/weekly-report', { timeout: 90000 });
    const data = unwrapResponse<WeeklyReport>(response.data).data;
    if (userId) {
      writeWeeklyReportCache(userId, data);
    }
    return data;
  },

  /** 清除当日缓存并重新请求周报（会触发 AI 成本） */
  refreshWeeklyReport: async (userId: string): Promise<WeeklyReport> => {
    clearWeeklyReportCache(userId);
    const response = await api.get('/analytics/weekly-report', { timeout: 90000 });
    const data = unwrapResponse<WeeklyReport>(response.data).data;
    writeWeeklyReportCache(userId, data);
    return data;
  },
};
