import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowPathIcon, PauseCircleIcon, PlayIcon } from '@heroicons/react/24/outline';
import type { AgentTask } from '../types';
import { agentTaskApi } from '../services/api';

const terminalStates: AgentTask['state'][] = ['COMPLETED', 'ERROR', 'CANCELLED'];

const statusText: Record<AgentTask['state'], string> = {
  UNINITIALIZED: '排队中',
  RUNNING: '执行中',
  COMPLETED: '已完成',
  ERROR: '失败',
  CANCELLED: '已取消',
};

const statusBadgeClass: Record<AgentTask['state'], string> = {
  UNINITIALIZED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
  RUNNING: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  COMPLETED: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
  ERROR: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300',
  CANCELLED: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
};

function toPrettyTaskType(taskType: AgentTask['taskType']): string {
  switch (taskType) {
    case 'PLAN_GENERATION':
      return '计划生成';
    case 'REVIEW_SUMMARY':
      return '复盘摘要';
    case 'ADAPTIVE_ADJUSTMENT':
      return '自适应调整';
    case 'COACH_SUGGESTION':
      return '教练建议';
    default:
      return taskType;
  }
}

export default function TaskCenterPage() {
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await agentTaskApi.list();
      setTasks(data);
    } catch (err: any) {
      setError(err?.message || '加载任务失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const hasLiveTask = tasks.some((task) => !terminalStates.includes(task.state));
    if (!hasLiveTask) return;
    const timer = window.setInterval(() => {
      loadTasks();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [tasks, loadTasks]);

  const runningCount = useMemo(
    () => tasks.filter((task) => task.state === 'RUNNING' || task.state === 'UNINITIALIZED').length,
    [tasks],
  );
  const filteredState = searchParams.get('state') as AgentTask['state'] | null;
  const visibleTasks = useMemo(() => {
    if (!filteredState) return tasks;
    return tasks.filter((task) => task.state === filteredState);
  }, [tasks, filteredState]);

  const handleCancel = async (taskId: string) => {
    setActionTaskId(taskId);
    try {
      await agentTaskApi.cancel(taskId);
      await loadTasks();
    } finally {
      setActionTaskId(null);
    }
  };

  const handleRetry = async (taskId: string) => {
    setActionTaskId(taskId);
    try {
      await agentTaskApi.retry(taskId);
      await loadTasks();
    } finally {
      setActionTaskId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">任务中心</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            管理 Agent 异步任务，支持查看状态、取消与重试。
          </p>
          {filteredState && (
            <p className="mt-1 text-xs text-primary-700 dark:text-primary-300">
              当前筛选状态：{filteredState}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            进行中: <span className="font-semibold">{runningCount}</span>
          </span>
          <button
            onClick={loadTasks}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger-200 bg-danger-50 p-3 text-danger-700 dark:border-danger-700 dark:bg-danger-900/20 dark:text-danger-200">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-gray-600 dark:text-gray-300">加载中...</div>
        ) : visibleTasks.length === 0 ? (
          <div className="p-6 text-sm text-gray-600 dark:text-gray-300">暂无任务记录</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {visibleTasks.map((task) => {
              const inputText = JSON.stringify(task.input ?? {});
              const outputText = task.output ? JSON.stringify(task.output) : '';
              const canCancel = task.state === 'UNINITIALIZED' || task.state === 'RUNNING';
              const canRetry = task.state === 'ERROR' || task.state === 'CANCELLED';

              return (
                <div key={task.id} className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {toPrettyTaskType(task.taskType)}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${statusBadgeClass[task.state]}`}>
                          {statusText[task.state]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {task.id} · {new Date(task.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCancel(task.id)}
                        disabled={!canCancel || actionTaskId === task.id}
                        className="btn-secondary text-xs flex items-center gap-1 disabled:opacity-50"
                      >
                        <PauseCircleIcon className="h-4 w-4" />
                        取消
                      </button>
                      <button
                        onClick={() => handleRetry(task.id)}
                        disabled={!canRetry || actionTaskId === task.id}
                        className="btn-primary text-xs flex items-center gap-1 disabled:opacity-50"
                      >
                        <PlayIcon className="h-4 w-4" />
                        重试
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">输入</p>
                      <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                        {inputText}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">输出 / 错误</p>
                      <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                        {task.errorMessage || outputText || '-'}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
