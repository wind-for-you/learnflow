import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../services/api';
import type { AdminOverview, AdminUserListItem, AuditLogEntry } from '../types';

export default function AdminPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [userSortBy, setUserSortBy] = useState<'createdAt' | 'name' | 'email' | 'role'>('createdAt');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('desc');
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [logActionFilter, setLogActionFilter] = useState('');
  const [logStartAt, setLogStartAt] = useState('');
  const [logEndAt, setLogEndAt] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logPagination, setLogPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const adminCount = useMemo(() => users.filter((item) => item.role === 'ADMIN').length, [users]);

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const [overviewResp, usersResp, logsResp] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getUsers({
          page: userPage,
          limit: userPagination.limit,
          search: userSearch || undefined,
          role: userRoleFilter === 'ALL' ? undefined : userRoleFilter,
          isActive:
            userStatusFilter === 'ALL'
              ? undefined
              : userStatusFilter === 'ACTIVE',
          sortBy: userSortBy,
          sortOrder: userSortOrder,
        }),
        adminApi.getAuditLogs({
          page: logPage,
          limit: logPagination.limit,
          action: logActionFilter || undefined,
          startAt: logStartAt ? new Date(`${logStartAt}T00:00:00`).toISOString() : undefined,
          endAt: logEndAt ? new Date(`${logEndAt}T23:59:59`).toISOString() : undefined,
        }),
      ]);
      setOverview(overviewResp);
      setUsers(usersResp.users);
      setUserPagination(usersResp.pagination);
      setLogs(logsResp.logs);
      setLogPagination(logsResp.pagination);
    } catch (err) {
      const message = (err as { message?: string })?.message || '加载管理后台数据失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [userSearch, userRoleFilter, userStatusFilter, userSortBy, userSortOrder, userPage, userPagination.limit, logActionFilter, logStartAt, logEndAt, logPage, logPagination.limit]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userRoleFilter, userStatusFilter, userSortBy, userSortOrder]);

  useEffect(() => {
    setLogPage(1);
  }, [logActionFilter, logStartAt, logEndAt]);

  const handleRoleChange = async (user: AdminUserListItem, role: 'USER' | 'ADMIN') => {
    if (user.role === role) {
      return;
    }
    try {
      setUpdatingUserId(user.id);
      await adminApi.updateUserRole(user.id, role);
      await loadData();
    } catch (err) {
      const message = (err as { message?: string })?.message || '更新角色失败';
      setError(message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleStatusChange = async (user: AdminUserListItem, isActive: boolean) => {
    if (user.isActive === isActive) {
      return;
    }
    try {
      setUpdatingUserId(user.id);
      await adminApi.updateUserStatus(user.id, isActive);
      await loadData();
    } catch (err) {
      const message = (err as { message?: string })?.message || '更新账号状态失败';
      setError(message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleExportLogs = async () => {
    try {
      const blob = await adminApi.exportAuditLogsCsv({
        action: logActionFilter || undefined,
        startAt: logStartAt ? new Date(`${logStartAt}T00:00:00`).toISOString() : undefined,
        endAt: logEndAt ? new Date(`${logEndAt}T23:59:59`).toISOString() : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = (err as { message?: string })?.message || '导出 CSV 失败';
      setError(message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">管理后台</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">用户与审计最小管理面板</p>
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: '用户数', value: overview?.users ?? '-' },
          { label: '目标数', value: overview?.goals ?? '-' },
          { label: '计划数', value: overview?.plans ?? '-' },
          { label: '任务数', value: overview?.tasks ?? '-' },
          { label: 'Agent任务', value: overview?.agentTasks ?? '-' },
        ].map((card) => (
          <div key={card.label} className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">{card.label}</div>
            <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">用户管理</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">管理员 {adminCount} 人</span>
        </div>
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="搜索邮箱/用户名"
            className="input"
          />
          <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value as 'ALL' | 'USER' | 'ADMIN')} className="input">
            <option value="ALL">全部角色</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <select value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')} className="input">
            <option value="ALL">全部状态</option>
            <option value="ACTIVE">启用</option>
            <option value="INACTIVE">停用</option>
          </select>
          <select value={userSortBy} onChange={(e) => setUserSortBy(e.target.value as 'createdAt' | 'name' | 'email' | 'role')} className="input">
            <option value="createdAt">按创建时间</option>
            <option value="name">按用户名</option>
            <option value="email">按邮箱</option>
            <option value="role">按角色</option>
          </select>
          <select value={userSortOrder} onChange={(e) => setUserSortOrder(e.target.value as 'asc' | 'desc')} className="input">
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
          <button
            className="btn-secondary"
            onClick={() => {
              setUserSearch('');
              setUserRoleFilter('ALL');
              setUserStatusFilter('ALL');
              setUserSortBy('createdAt');
              setUserSortOrder('desc');
              setUserPage(1);
            }}
          >
            重置筛选
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="text-left px-4 py-2">用户</th>
                <th className="text-left px-4 py-2">角色</th>
                <th className="text-left px-4 py-2">状态</th>
                <th className="text-left px-4 py-2">资源数</th>
                <th className="text-left px-4 py-2">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={user.role}
                      onChange={(event) => void handleRoleChange(user, event.target.value as 'USER' | 'ADMIN')}
                      disabled={updatingUserId === user.id}
                      className="input py-1 text-sm"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className={user.isActive ? 'text-success-600' : 'text-error-600'}>
                        {user.isActive ? '启用' : '停用'}
                      </span>
                      <button
                        className="btn-secondary py-1 px-2 text-xs"
                        disabled={updatingUserId === user.id}
                        onClick={() => void handleStatusChange(user, !user.isActive)}
                      >
                        {user.isActive ? '停用' : '启用'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                    目标 {user._count.goals} / 计划 {user._count.plans} / Agent {user._count.agentTasks}
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    暂无用户数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>第 {userPagination.page}/{userPagination.totalPages} 页，共 {userPagination.total} 条</span>
          <div className="flex items-center gap-2">
            <button className="btn-secondary py-1 px-2 text-xs" disabled={userPage <= 1} onClick={() => setUserPage((p) => Math.max(1, p - 1))}>
              上一页
            </button>
            <button
              className="btn-secondary py-1 px-2 text-xs"
              disabled={userPage >= userPagination.totalPages}
              onClick={() => setUserPage((p) => Math.min(userPagination.totalPages, p + 1))}
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">审计日志（最近 10 条）</h2>
        </div>
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            value={logActionFilter}
            onChange={(e) => setLogActionFilter(e.target.value)}
            placeholder="按 action 过滤"
            className="input"
          />
          <input type="date" value={logStartAt} onChange={(e) => setLogStartAt(e.target.value)} className="input" />
          <input type="date" value={logEndAt} onChange={(e) => setLogEndAt(e.target.value)} className="input" />
          <button
            className="btn-secondary"
            onClick={() => {
              setLogActionFilter('');
              setLogStartAt('');
              setLogEndAt('');
              setLogPage(1);
            }}
          >
            重置筛选
          </button>
          <button className="btn-primary" onClick={() => void handleExportLogs()}>
            导出 CSV
          </button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {logs.map((log) => (
            <div key={log.id} className="px-4 py-3 text-sm">
              <div className="font-medium text-gray-900 dark:text-white">{log.action}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                操作人 {log.actor.name} ({log.actor.email}) · 目标 {log.targetType}
                {log.targetId ? `/${log.targetId}` : ''} · {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
          {!loading && logs.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无审计日志</div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>第 {logPagination.page}/{logPagination.totalPages} 页，共 {logPagination.total} 条</span>
          <div className="flex items-center gap-2">
            <button className="btn-secondary py-1 px-2 text-xs" disabled={logPage <= 1} onClick={() => setLogPage((p) => Math.max(1, p - 1))}>
              上一页
            </button>
            <button
              className="btn-secondary py-1 px-2 text-xs"
              disabled={logPage >= logPagination.totalPages}
              onClick={() => setLogPage((p) => Math.min(logPagination.totalPages, p + 1))}
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
