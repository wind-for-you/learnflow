import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { adminApi } from '../services/api';
import type { AdminOverview, AdminUserListItem, AuditLogEntry, LlmActivePreview, LlmProfileAdminRow } from '../types';

type AdminSection = 'users' | 'llm';

export default function AdminPage() {
  const { pathname } = useLocation();
  const section: AdminSection = pathname.includes('/admin/integration') ? 'llm' : 'users';
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [llmProfiles, setLlmProfiles] = useState<LlmProfileAdminRow[]>([]);
  const [llmActive, setLlmActive] = useState<LlmActivePreview | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    label: string;
    baseUrl: string;
    model: string;
    timeoutMs: string;
  } | null>(null);
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

  const loadLlm = async (): Promise<void> => {
    try {
      setLlmLoading(true);
      setLlmError(null);
      const pack = await adminApi.getLlmProfiles();
      setLlmProfiles(pack.profiles);
      setLlmActive(pack.activePreview);
    } catch (err) {
      const message = (err as { message?: string })?.message || '加载 LLM 配置失败';
      setLlmError(message);
    } finally {
      setLlmLoading(false);
    }
  };

  useEffect(() => {
    if (section !== 'users') {
      return;
    }
    void loadData();
  }, [section, userSearch, userRoleFilter, userStatusFilter, userSortBy, userSortOrder, userPage, userPagination.limit, logActionFilter, logStartAt, logEndAt, logPage, logPagination.limit]);

  useEffect(() => {
    if (section !== 'llm') {
      return;
    }
    void loadLlm();
  }, [section]);

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

  const handleSaveLlm = async (id: string): Promise<void> => {
    if (!editing || editing.id !== id) return;
    const timeoutMs = parseInt(editing.timeoutMs, 10);
    if (!Number.isFinite(timeoutMs) || timeoutMs < 3000 || timeoutMs > 120000) {
      setLlmError('超时须为 3000–120000 毫秒');
      return;
    }
    try {
      setLlmLoading(true);
      await adminApi.patchLlmProfile(id, {
        label: editing.label.trim(),
        baseUrl: editing.baseUrl.trim() === '' ? null : editing.baseUrl.trim(),
        model: editing.model.trim() === '' ? null : editing.model.trim(),
        timeoutMs,
      });
      setEditing(null);
      await loadLlm();
    } catch (err) {
      const message = (err as { message?: string })?.message || '保存失败';
      setLlmError(message);
    } finally {
      setLlmLoading(false);
    }
  };

  const handleSetDefaultLlm = async (id: string): Promise<void> => {
    try {
      setLlmLoading(true);
      setLlmError(null);
      await adminApi.setDefaultLlmProfile(id);
      await loadLlm();
    } catch (err) {
      const message = (err as { message?: string })?.message || '切换默认失败';
      setLlmError(message);
    } finally {
      setLlmLoading(false);
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

  const card =
    'rounded-xl border border-slate-800/90 bg-slate-900/55 text-slate-200 shadow-sm shadow-black/20';
  const cardHead = 'px-4 py-3 border-b border-slate-800/90';

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          className="rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          onClick={() => (section === 'users' ? void loadData() : void loadLlm())}
          disabled={section === 'users' ? loading : llmLoading}
        >
          刷新当前页数据
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-100">{error}</div>
      )}

      {section === 'llm' && llmError && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-100">{llmError}</div>
      )}

      {section === 'llm' && (
        <div className="space-y-4">
          <div className={`${card} p-4 text-sm`}>
            <h2 className="text-sm font-semibold text-slate-100 mb-2">当前接入解析（密钥不落库）</h2>
            {llmActive ? (
              <ul className="space-y-1 text-slate-300">
                <li>
                  方案：<span className="font-medium text-slate-100">{llmActive.profileLabel}</span>
                  <span className="text-slate-500">（{llmActive.profileSlug}）</span>
                </li>
                <li>通道：{llmActive.channel}</li>
                <li className="break-all">服务地址：{llmActive.baseURL}</li>
                <li>模型：{llmActive.model}</li>
                <li>超时：{llmActive.timeoutMs} ms</li>
                <li>服务端密钥：{llmActive.hasApiKey ? '已配置' : '未配置（将使用内置规则或降级能力）'}</li>
              </ul>
            ) : (
              <p className="text-slate-500">暂无可用配置</p>
            )}
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              密钥仅在服务器环境变量中配置，切勿在浏览器或聊天中传输。部署与变量说明见运维文档。
            </p>
          </div>

          <div className={`${card} overflow-hidden`}>
            <div className={`${cardHead} flex justify-between items-center`}>
              <h2 className="text-sm font-semibold text-slate-100">接入方案列表</h2>
              {llmLoading && <span className="text-xs text-slate-500">加载中…</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-950/60 text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-2">方案</th>
                    <th className="text-left px-4 py-2">通道</th>
                    <th className="text-left px-4 py-2">密钥（服务端）</th>
                    <th className="text-left px-4 py-2">默认</th>
                    <th className="text-left px-4 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {llmProfiles.map((p) => (
                    <tr key={p.id} className="border-t border-slate-800/80 align-top">
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-100">{p.label}</div>
                        <div className="text-xs text-slate-500">{p.slug}</div>
                        {editing?.id === p.id ? (
                          <div className="mt-2 space-y-2 max-w-md">
                            <input
                              className="input text-xs"
                              value={editing.label}
                              onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                              placeholder="显示名"
                            />
                            <input
                              className="input text-xs"
                              value={editing.baseUrl}
                              onChange={(e) => setEditing({ ...editing, baseUrl: e.target.value })}
                              placeholder="Base URL，空则使用环境默认"
                            />
                            <input
                              className="input text-xs"
                              value={editing.model}
                              onChange={(e) => setEditing({ ...editing, model: e.target.value })}
                              placeholder="模型 ID，空则使用环境默认"
                            />
                            <input
                              className="input text-xs"
                              value={editing.timeoutMs}
                              onChange={(e) => setEditing({ ...editing, timeoutMs: e.target.value })}
                              placeholder="超时 ms"
                            />
                            <div className="flex gap-2">
                              <button type="button" className="btn-primary text-xs py-1" onClick={() => void handleSaveLlm(p.id)}>
                                保存
                              </button>
                              <button type="button" className="btn-secondary text-xs py-1" onClick={() => setEditing(null)}>
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                            <div className="break-all">地址: {p.baseUrl || '（随部署默认）'}</div>
                            <div>模型: {p.model || '（随部署默认）'}</div>
                            <div>超时: {p.timeoutMs} ms</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-300">{p.channel}</td>
                      <td className="px-4 py-2">
                        <span className={p.envKeyConfigured ? 'text-emerald-400' : 'text-amber-400'}>
                          {p.envKeyConfigured ? '已配置' : '未配置'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-300">{p.isDefault ? '是' : '否'}</td>
                      <td className="px-4 py-2 space-y-2">
                        {!p.isDefault && (
                          <button
                            type="button"
                            className="btn-secondary text-xs py-1 block w-full"
                            disabled={llmLoading || !p.enabled}
                            onClick={() => void handleSetDefaultLlm(p.id)}
                          >
                            设为默认
                          </button>
                        )}
                        {editing?.id !== p.id && (
                          <button
                            type="button"
                            className="btn-secondary text-xs py-1 block w-full"
                            disabled={llmLoading}
                            onClick={() =>
                              setEditing({
                                id: p.id,
                                label: p.label,
                                baseUrl: p.baseUrl || '',
                                model: p.model || '',
                                timeoutMs: String(p.timeoutMs),
                              })
                            }
                          >
                            编辑
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!llmLoading && llmProfiles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        暂无接入方案，请确认服务已升级并重启
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {section === 'users' && (
        <>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: '用户数', value: overview?.users ?? '-' },
          { label: '目标数', value: overview?.goals ?? '-' },
          { label: '计划数', value: overview?.plans ?? '-' },
          { label: '任务数', value: overview?.tasks ?? '-' },
          { label: '智能任务', value: overview?.agentTasks ?? '-' },
        ].map((c) => (
          <div key={c.label} className={`${card} p-4`}>
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className="mt-1 text-xl font-semibold text-slate-100">{c.value}</div>
          </div>
        ))}
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className={`${cardHead} flex items-center justify-between`}>
          <h2 className="text-sm font-semibold text-slate-100">用户管理</h2>
          <span className="text-xs text-slate-500">管理员 {adminCount} 人</span>
        </div>
        <div className="px-4 py-3 border-b border-slate-800/90 grid grid-cols-1 md:grid-cols-6 gap-3">
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
            <thead className="bg-slate-950/60 text-slate-400">
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
                <tr key={user.id} className="border-t border-slate-800/80">
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-100">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
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
                  <td className="px-4 py-2 text-slate-300">
                    目标 {user._count.goals} / 计划 {user._count.plans} / 智能任务 {user._count.agentTasks}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {new Date(user.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    暂无用户数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-800/90 flex items-center justify-between text-xs text-slate-500">
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

      <div className={`${card} overflow-hidden`}>
        <div className={cardHead}>
          <h2 className="text-sm font-semibold text-slate-100">审计日志（最近 10 条）</h2>
        </div>
        <div className="px-4 py-3 border-b border-slate-800/90 grid grid-cols-1 md:grid-cols-5 gap-3">
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
        <div className="divide-y divide-slate-800/80">
          {logs.map((log) => (
            <div key={log.id} className="px-4 py-3 text-sm">
              <div className="font-medium text-slate-100">{log.action}</div>
              <div className="text-xs text-slate-500">
                操作人 {log.actor.name} ({log.actor.email}) · 目标 {log.targetType}
                {log.targetId ? `/${log.targetId}` : ''} · {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
          {!loading && logs.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">暂无审计日志</div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-800/90 flex items-center justify-between text-xs text-slate-500">
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
        </>
      )}
    </div>
  );
}
