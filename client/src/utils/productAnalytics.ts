import { api } from '../services/api/http';

type QueuedEvent = { name: string; props?: Record<string, unknown> };

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_MS = 2500;
const MAX_BATCH = 50;

function hasAuthToken(): boolean {
  return Boolean(localStorage.getItem('token'));
}

function scheduleFlush(): void {
  if (flushTimer != null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, FLUSH_MS);
}

/**
 * 上报产品埋点（需已登录；无 token 时静默丢弃）。
 * 事件名：字母数字下划线与点，长度 1–80（与后端校验一致）。
 */
export function track(name: string, props?: Record<string, unknown>): void {
  if (!hasAuthToken()) return;
  queue.push(props === undefined ? { name } : { name, props });
  if (queue.length >= MAX_BATCH) {
    void flushQueue();
    return;
  }
  scheduleFlush();
}

/** 立即刷队列（登出前或测试用） */
export async function flushQueue(): Promise<void> {
  if (!hasAuthToken() || queue.length === 0) {
    queue.length = 0;
    return;
  }
  const batch = queue.splice(0, MAX_BATCH);
  try {
    await api.post('/analytics/events', { events: batch });
  } catch {
    queue.unshift(...batch);
  }
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flushQueue();
    }
  });
}
