import type { WeeklyReport } from '../types';

const SCHEMA = 1;
const STORAGE_PREFIX = 'learnflow:weeklyReport:v';

function localDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function weeklyReportCacheKey(userId: string): string {
  return `${STORAGE_PREFIX}${SCHEMA}:${userId}:${localDateKey()}`;
}

function isWeeklyReportShape(v: unknown): v is WeeklyReport {
  if (!v || typeof v !== 'object') return false;
  const o = v as WeeklyReport;
  return (
    o.period === 'weekly' &&
    o.aiSummary != null &&
    typeof o.aiSummary.summary === 'string' &&
    Array.isArray(o.aiSummary.highlights) &&
    Array.isArray(o.aiSummary.suggestions)
  );
}

/** 读取当日缓存；无有效条目返回 null */
export function readWeeklyReportCache(userId: string): WeeklyReport | null {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(weeklyReportCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { schema?: number; data?: unknown };
    if (parsed.schema !== SCHEMA || !isWeeklyReportShape(parsed.data)) {
      localStorage.removeItem(weeklyReportCacheKey(userId));
      return null;
    }
    return parsed.data;
  } catch {
    try {
      localStorage.removeItem(weeklyReportCacheKey(userId));
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function writeWeeklyReportCache(userId: string, data: WeeklyReport): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify({ schema: SCHEMA, dateKey: localDateKey(), data });
    localStorage.setItem(weeklyReportCacheKey(userId), payload);
  } catch {
    /* 配额满等：静默失败，仍以后端为准 */
  }
}

/** 清除当前用户「当天」缓存条目，用于主动刷新 */
export function clearWeeklyReportCache(userId: string): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(weeklyReportCacheKey(userId));
  } catch {
    /* ignore */
  }
}
