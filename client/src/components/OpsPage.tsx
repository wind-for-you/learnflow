import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { opsApi } from '../services/api';
import type { OpsSystemOverview } from '../types';

export default function OpsPage() {
  const [overview, setOverview] = useState<OpsSystemOverview | null>(null);
  const [taskState, setTaskState] = useState<Array<{ state: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const [overviewResp, queueResp] = await Promise.all([opsApi.getSystemOverview(), opsApi.getQueueMetrics()]);
      setOverview(overviewResp);
      setTaskState(queueResp.dbTaskState);
    } catch (err) {
      const message = (err as { message?: string })?.message || '加载运维数据失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">运维后台</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">发布指标 + 队列健康状态面板</p>
        </div>
        <button className="btn-primary" onClick={() => void loadData()} disabled={loading}>
          刷新
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-error-300 bg-error-50 dark:bg-error-900/20 p-3 text-sm text-error-700 dark:text-error-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: '总请求', value: overview?.releaseMetrics.totalRequests ?? '-' },
          { label: '成功率', value: overview ? `${overview.releaseMetrics.successRate}%` : '-' },
          { label: '错误任务数', value: overview?.failedTaskCount ?? '-' },
          { label: 'Worker并发', value: overview?.workerConcurrency ?? '-' },
        ].map((card) => (
          <div key={card.label} className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">{card.label}</div>
            <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">失败任务快速处理</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">跳转任务中心并自动筛选 ERROR 状态任务</p>
        </div>
        <Link to="/task-center?state=ERROR" className="btn-primary">
          去任务中心处理
        </Link>
      </div>

      <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">队列指标（BullMQ）</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
          {Object.entries(overview?.queueMetrics || {}).map(([key, value]) => (
            <div key={key} className="rounded border border-gray-200 dark:border-gray-700 p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">{key}</div>
              <div className="text-base font-medium text-gray-900 dark:text-white">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">DB 任务状态分布</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {taskState.map((item) => (
            <div key={item.state} className="px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">{item.state}</span>
              <span className="font-medium text-gray-900 dark:text-white">{item.count}</span>
            </div>
          ))}
          {!loading && taskState.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无任务状态数据</div>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        Redis: {overview?.redisUrl || '-'} · 服务时间: {overview ? new Date(overview.serverTime).toLocaleString() : '-'}
      </div>
    </div>
  );
}
