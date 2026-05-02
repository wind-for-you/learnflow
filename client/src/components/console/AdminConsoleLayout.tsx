import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon,
  HomeIcon,
  CpuChipIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

function navLinkClass(isActive: boolean): string {
  return [
    'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border',
    isActive
      ? 'bg-amber-500/10 text-amber-100 border-amber-500/35 shadow-sm shadow-amber-900/20'
      : 'text-slate-400 border-transparent hover:bg-slate-800/90 hover:text-slate-100',
  ].join(' ');
}

export default function AdminConsoleLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isIntegration = pathname.includes('/integration');

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-200">
      <aside className="w-60 shrink-0 flex flex-col border-r border-slate-800/90 bg-slate-900">
        <div className="p-5 border-b border-slate-800">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">LearnFlow</p>
          <p className="mt-1.5 text-base font-semibold tracking-tight text-amber-50">管理控制台</p>
          <p className="mt-3 text-xs text-slate-500 truncate" title={user?.email || ''}>
            {user?.email}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/admin" end className={({ isActive }) => navLinkClass(isActive)}>
            <UsersIcon className="h-5 w-5 shrink-0 opacity-80" />
            账号与审计
          </NavLink>
          <NavLink to="/admin/integration" className={({ isActive }) => navLinkClass(isActive)}>
            <CpuChipIcon className="h-5 w-5 shrink-0 opacity-80" />
            模型与接入
          </NavLink>
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1 text-sm">
          <Link
            to="/ops"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-800/80 hover:text-emerald-300 transition-colors"
          >
            运行观测台
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-800/80 hover:text-slate-100 transition-colors"
          >
            <HomeIcon className="h-4 w-4" />
            回到学习应用
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-500 hover:bg-slate-800/80 hover:text-rose-300 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-slate-800/90 bg-slate-900/50 backdrop-blur-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">当前模块</p>
            <h1 className="text-sm font-semibold text-slate-100">
              {isIntegration ? '模型与接入' : '账号与审计'}
            </h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
