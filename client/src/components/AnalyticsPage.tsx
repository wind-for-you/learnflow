import { useEffect, useState } from 'react';
import { SparklesIcon, ChartBarIcon, ClockIcon, FireIcon } from '@heroicons/react/24/outline';
import { analyticsApi, checkinApi } from '../services/api';
import StudyTimeChart from './charts/StudyTimeChart';
import type { AnalyticsOverview, Checkin, WeeklyReport } from '../types';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [overviewResp, reportResp, checkinsResp] = await Promise.all([
          analyticsApi.getOverview(range),
          analyticsApi.getWeeklyReport(),
          checkinApi.getCheckins({ limit: 60 }),
        ]);

        setOverview(overviewResp);
        setWeeklyReport(reportResp);
        setCheckins(checkinsResp.checkins);
      } catch (err) {
        console.error('加载分析页数据失败:', err);
        setError('加载分析数据失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [range]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card border border-red-200 dark:border-red-900/40">
          <div className="card-body text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!overview && !weeklyReport) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <div className="card-body text-center py-16">
            <ChartBarIcon className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">暂无分析数据</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">先完成一些学习任务和打卡，再回来查看趋势。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">学习分析</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">趋势 + AI 建议，持续优化学习路径</p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as '7d' | '30d' | '90d')}
          className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="7d">近 7 天</option>
          <option value="30d">近 30 天</option>
          <option value="90d">近 90 天</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="card-body flex items-center">
            <FireIcon className="h-8 w-8 text-warning-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">连续学习</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview?.streak ?? 0} 天</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center">
            <ClockIcon className="h-8 w-8 text-info-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">学习总时长</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round((overview?.studyMinutes ?? 0) / 60)} 小时</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center">
            <ChartBarIcon className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">任务完成率</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round((overview?.completionRate ?? 0) * 100)}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <StudyTimeChart checkins={checkins} period="month" isDark={false} />

        <div className="card border border-primary-200 dark:border-primary-900/40">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <SparklesIcon className="h-5 w-5 text-primary-600 mr-2" />
              AI 周建议
            </h2>
          </div>
          <div className="card-body space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">{weeklyReport?.aiSummary.summary || '暂无 AI 建议'}</p>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">亮点</p>
              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {(weeklyReport?.aiSummary.highlights || []).slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">建议</p>
              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {(weeklyReport?.aiSummary.suggestions || []).slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
