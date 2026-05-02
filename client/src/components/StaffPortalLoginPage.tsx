import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import type { LoginCredentials } from '../types';

type StaffPortal = 'admin' | 'ops';

const portalCopy: Record<
  StaffPortal,
  { title: string; subtitle: string; badge: string; accent: string; panelClass: string }
> = {
  admin: {
    title: '管理后台登录',
    subtitle: '用户管理 · 审计 · 大模型运行配置（Wave 3.5）',
    badge: 'ADMIN CONSOLE',
    accent: 'from-amber-600 to-orange-700',
    panelClass: 'border-amber-500/40 bg-amber-950/30 text-amber-100',
  },
  ops: {
    title: '运维后台登录',
    subtitle: '发布指标 · 队列健康 · D7 留存 · Agent 失败排查',
    badge: 'OPS CONSOLE',
    accent: 'from-emerald-600 to-teal-800',
    panelClass: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100',
  },
};

export default function StaffPortalLoginPage({ portal }: { portal: StaffPortal }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout, isLoading, error, clearError, isAuthenticated, user } = useAuth();
  const copy = portalCopy[portal];
  const defaultTarget = portal === 'ops' ? '/ops' : '/admin';
  const from =
    (location.state as { from?: string } | undefined)?.from &&
    String((location.state as { from?: string }).from).startsWith('/')
      ? String((location.state as { from?: string }).from)
      : defaultTarget;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => clearError(), 6000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim() || !password) {
      setLocalError('请填写邮箱与密码');
      return;
    }
    try {
      const credentials: LoginCredentials = {
        email: email.trim(),
        password,
        loginPortal: portal,
      };
      await login(credentials);
    } catch {
      /* AuthContext 已 set error */
    }
  };

  const wrongRole = Boolean(isAuthenticated && user && user.role !== 'ADMIN');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 py-10 px-4">
      <div
        className={`absolute inset-0 opacity-30 pointer-events-none bg-gradient-to-br ${copy.accent}`}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md">
        <div className={`rounded-xl border-2 p-4 mb-6 ${copy.panelClass}`}>
          <p className="text-xs font-mono tracking-widest opacity-90">{copy.badge}</p>
          <h1 className="mt-2 text-2xl font-bold text-white">{copy.title}</h1>
          <p className="mt-1 text-sm opacity-90">{copy.subtitle}</p>
          <p className="mt-3 text-xs leading-relaxed opacity-80 border-t border-white/10 pt-3">
            {portal === 'admin'
              ? '此页面仅用于管理员进入「管理后台」。学习用户请勿在此输入账号；若误进请前往主站登录页。'
              : '此页面仅用于管理员进入「运维监控」。与「管理后台」用途不同：侧重指标、队列与 Agent 排障，不含用户运营配置入口。'}
          </p>
        </div>

        <div className="rounded-xl bg-slate-900/90 border border-slate-700 p-6 shadow-xl">
          <div className="flex flex-wrap gap-2 text-xs mb-4">
            <Link to="/login" className="text-sky-400 hover:underline">
              ← 学习用户主站登录（/login）
            </Link>
            <span className="text-slate-600">|</span>
            {portal === 'admin' ? (
              <Link to="/ops/login" className="text-emerald-400 hover:underline">
                我要去「运维后台」登录 →
              </Link>
            ) : (
              <Link to="/admin/login" className="text-amber-400 hover:underline">
                我要去「管理后台」登录 →
              </Link>
            )}
          </div>

          {wrongRole && (
            <div className="mb-4 rounded-lg border border-rose-500/50 bg-rose-950/40 p-3 text-sm text-rose-100">
              当前已以非管理员身份登录，无法进入{portal === 'admin' ? '管理' : '运维'}后台。请先退出再使用管理员账号登录。
              <button type="button" className="mt-2 block w-full btn-secondary text-xs py-2" onClick={() => logout()}>
                退出当前账号
              </button>
            </div>
          )}

          {(error || localError) && (
            <div className="mb-4 rounded-md border border-rose-400/40 bg-rose-950/50 p-3 text-sm text-rose-100">
              {localError || error}
            </div>
          )}

          {!wrongRole && (
            <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
              <div>
                <label htmlFor="staff-email" className="block text-sm font-medium text-slate-300">
                  管理员邮箱
                </label>
                <input
                  id="staff-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 input bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  placeholder="admin@learnflow.com"
                />
              </div>
              <div>
                <label htmlFor="staff-password" className="block text-sm font-medium text-slate-300">
                  密码
                </label>
                <div className="mt-1 relative">
                  <input
                    id="staff-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    placeholder="请输入密码"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r ${copy.accent} disabled:opacity-50`}
              >
                {isLoading ? '验证中…' : '登录'}
              </button>
            </form>
          )}

          <p className="mt-6 text-[11px] text-slate-500 leading-relaxed">
            内置默认管理员账号见部署文档（生产环境务必修改密码）。切勿与普通学员账号混用同一浏览器配置，以免权限混淆。
          </p>
        </div>
      </div>
    </div>
  );
}
