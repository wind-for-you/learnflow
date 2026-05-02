import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { opsApi } from '../services/api';
import type { AgentRecentErrorRow, OpsSystemOverview } from '../types';

type OpsSection = 'overview' | 'streams' | 'insight' | 'incidents';

function resolveSection(pathname: string): OpsSection {
  if (pathname.includes('/streams')) return 'streams';
  if (pathname.includes('/insight')) return 'insight';
  if (pathname.includes('/incidents')) return 'incidents';
  return 'overview';
}

/** 将队列指标键转为控制台可读标签（避免暴露实现库名） */
function queueMetricLabel(key: string): string {
  const map: Record<string, string> = {
    waiting: '等待',
    active: '执行中',
    completed: '已完成',
    failed: '失败',
    delayed: '延迟',
    paused: '已暂停',
    prioritized: '优先',
    'waiting-children': '子任务等待',
  };
  return map[key] ?? key.replace(/[-_]/g, ' ');
}

const card =
  'rounded-xl border border-zinc-800/90 bg-zinc-900/50 text-zinc-200 shadow-sm shadow-black/25';
const cardHead = 'px-4 py-3 border-b border-zinc-800/90';

export default function OpsPage() {
  const { pathname } = useLocation();
  const section = useMemo(() => resolveSection(pathname), [pathname]);

  const [overview, setOverview] = useState<OpsSystemOverview | null>(null);
  const [taskState, setTaskState] = useState<Array<{ state: string; count: number }>>([]);
  const [retention, setRetention] = useState<
    Array<{ cohortDay: string; registered: number; retainedD7: number; rateApprox: number }>
  >([]);
  const [agentErrors, setAgentErrors] = useState<AgentRecentErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const [overviewResp, queueResp, retentionResp, errorsResp] = await Promise.all([
        opsApi.getSystemOverview(),
        opsApi.getQueueMetrics(),
        opsApi.getRetentionD7(),
        opsApi.getAgentRecentErrors(25),
      ]);
      setOverview(overviewResp);
      setTaskState(queueResp.dbTaskState);
      setRetention(retentionResp);
      setAgentErrors(errorsResp);
    } catch (err) {
      const message = (err as { message?: string })?.message || '加载运行数据失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const queueEntries = Object.entries(overview?.queueMetrics || {});

  const infraHint = overview?.redisUrl
    ? `异步任务后端：${overview.redisUrl}`
    : '异步任务后端：未返回连接摘要';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          className="rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          onClick={() => void loadData()}
          disabled={loading}
        >
          刷新数据
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-100">{error}</div>
      )}

      {section === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: '总请求量', value: overview?.releaseMetrics.totalRequests ?? '-' },
              { label: '成功率', value: overview ? `${overview.releaseMetrics.successRate}%` : '-' },
              { label: '失败任务数', value: overview?.failedTaskCount ?? '-' },
              { label: '并发处理能力', value: overview?.workerConcurrency ?? '-' },
            ].map((c) => (
              <div key={c.label} className={`${card} p-4`}>
                <div className="text-xs text-zinc-500">{c.label}</div>
                <div className="mt-1 text-xl font-semibold text-zinc-50">{c.value}</div>
              </div>
            ))}
          </div>

          <div className={`${card} p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">失败任务集中处理</h2>
              <p className="text-xs text-zinc-500 mt-1">跳转到任务中心并筛选为错误状态，便于批量排查</p>
            </div>
            <Link
              to="/task-center?state=ERROR"
              className="inline-flex justify-center rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2"
            >
              打开任务中心
            </Link>
          </div>

          <p className="text-xs text-zinc-600">
            服务时间：{overview ? new Date(overview.serverTime).toLocaleString() : '-'} · {infraHint}
          </p>
        </>
      )}

      {section === 'streams' && (
        <>
          <div className={`${card} overflow-hidden`}>
            <div className={cardHead}>
              <h2 className="text-sm font-semibold text-zinc-100">异步队列深度</h2>
              <p className="text-xs text-zinc-500 mt-1">各阶段堆积量，用于判断是否需要扩容或排查阻塞</p>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
              {queueEntries.map(([key, value]) => (
                <div key={key} className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3">
                  <div className="text-xs text-zinc-500">{queueMetricLabel(key)}</div>
                  <div className="text-base font-medium text-zinc-100 mt-0.5">{value}</div>
                </div>
              ))}
              {!loading && queueEntries.length === 0 && (
                <div className="col-span-full text-center text-sm text-zinc-500 py-4">暂无队列指标</div>
              )}
            </div>
          </div>

          <div className={`${card} overflow-hidden`}>
            <div className={cardHead}>
              <h2 className="text-sm font-semibold text-zinc-100">持久化任务状态分布</h2>
              <p className="text-xs text-zinc-500 mt-1">与业务库同步的任务状态计数</p>
            </div>
            <div className="divide-y divide-zinc-800/80">
              {taskState.map((item) => (
                <div key={item.state} className="px-4 py-3 flex items-center justify-between text-sm">
                  <span className="text-zinc-300">{item.state}</span>
                  <span className="font-medium text-zinc-100">{item.count}</span>
                </div>
              ))}
              {!loading && taskState.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-zinc-500">暂无状态数据</div>
              )}
            </div>
          </div>
        </>
      )}

      {section === 'insight' && (
        <div className={`${card} overflow-hidden`}>
          <div className={cardHead}>
            <h2 className="text-sm font-semibold text-zinc-100">注册后第 7 日回访（近似）</h2>
            <p className="text-xs text-zinc-500 mt-1">
              按注册日分组；回访定义为注册后约一周内仍有学习侧活动。无分析数据时比例可能为 0。
            </p>
          </div>
          <div className="overflow-x-auto max-h-[min(28rem,70vh)] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-950/60 text-left text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-2">注册日</th>
                  <th className="px-4 py-2">注册数</th>
                  <th className="px-4 py-2">第 7 日仍活跃（近似）</th>
                  <th className="px-4 py-2">比例</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {retention.map((row) => (
                  <tr key={row.cohortDay}>
                    <td className="px-4 py-2 text-zinc-300">{row.cohortDay}</td>
                    <td className="px-4 py-2 text-zinc-300">{row.registered}</td>
                    <td className="px-4 py-2 text-zinc-300">{row.retainedD7}</td>
                    <td className="px-4 py-2 text-zinc-300">{(row.rateApprox * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                {!loading && retention.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      暂无分组数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'incidents' && (
        <div className={`${card} overflow-hidden`}>
          <div className={cardHead}>
            <h2 className="text-sm font-semibold text-zinc-100">智能任务近期错误摘要</h2>
            <p className="text-xs text-zinc-500 mt-1">
              来自任务记录中的可读错误信息。若为空请结合服务日志；模型与接入参数请在管理控制台「模型与接入」中维护。
            </p>
          </div>
          <div className="overflow-x-auto max-h-[min(24rem,60vh)] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-950/60 text-left text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-2">任务</th>
                  <th className="px-4 py-2">类型</th>
                  <th className="px-4 py-2">错误摘要</th>
                  <th className="px-4 py-2">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {agentErrors.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2 font-mono text-xs text-zinc-400">{row.id.slice(0, 12)}…</td>
                    <td className="px-4 py-2 text-zinc-300">
                      {row.taskType} / {row.agentType}
                    </td>
                    <td
                      className="px-4 py-2 text-zinc-200 max-w-md truncate"
                      title={row.errorMessage || ''}
                    >
                      {row.errorMessage || '（无文本）'}
                    </td>
                    <td className="px-4 py-2 text-zinc-500 whitespace-nowrap">
                      {new Date(row.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!loading && agentErrors.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      暂无错误任务记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
