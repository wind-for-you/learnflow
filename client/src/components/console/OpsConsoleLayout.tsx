import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon,
  HomeIcon,
  ChartBarIcon,
  ServerStackIcon,
  PresentationChartLineIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

function navLinkClass(isActive: boolean): string {
  return [
    'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border',
    isActive
      ? 'bg-emerald-500/10 text-emerald-50 border-emerald-500/35 shadow-sm shadow-emerald-950/30'
      : 'text-slate-400 border-transparent hover:bg-slate-800/90 hover:text-slate-100',
  ].join(' ');
}

export default function OpsConsoleLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/ops/login', { replace: true });
  };

  const sectionLabel = (() => {
    if (pathname.includes('/streams')) return '管线与堆积';
    if (pathname.includes('/insight')) return '留存洞察';
    if (pathname.includes('/incidents')) return '异常事件';
    return '运行总览';
  })();

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-200">
      <aside className="w-60 shrink-0 flex flex-col border-r border-zinc-800/90 bg-zinc-900">
        <div className="p-5 border-b border-zinc-800">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">LearnFlow</p>
          <p className="mt-1.5 text-base font-semibold tracking-tight text-emerald-50">运行观测台</p>
          <p className="mt-3 text-xs text-zinc-500 truncate" title={user?.email || ''}>
            {user?.email}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/ops" end className={({ isActive }) => navLinkClass(isActive)}>
            <ChartBarIcon className="h-5 w-5 shrink-0 opacity-80" />
            运行总览
          </NavLink>
          <NavLink to="/ops/streams" className={({ isActive }) => navLinkClass(isActive)}>
            <ServerStackIcon className="h-5 w-5 shrink-0 opacity-80" />
            管线与堆积
          </NavLink>
          <NavLink to="/ops/insight" className={({ isActive }) => navLinkClass(isActive)}>
            <PresentationChartLineIcon className="h-5 w-5 shrink-0 opacity-80" />
            留存洞察
          </NavLink>
          <NavLink to="/ops/incidents" className={({ isActive }) => navLinkClass(isActive)}>
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0 opacity-80" />
            异常事件
          </NavLink>
        </nav>

        <div className="p-3 border-t border-zinc-800 space-y-1 text-sm">
          <Link
            to="/admin"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-500 hover:bg-zinc-800/80 hover:text-amber-200 transition-colors"
          >
            管理控制台
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-100 transition-colors"
          >
            <HomeIcon className="h-4 w-4" />
            回到学习应用
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-500 hover:bg-zinc-800/80 hover:text-rose-300 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-zinc-800/90 bg-zinc-900/50 backdrop-blur-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">当前视图</p>
            <h1 className="text-sm font-semibold text-zinc-100">{sectionLabel}</h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
