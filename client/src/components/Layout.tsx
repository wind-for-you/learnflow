import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import AppFooter from './AppFooter';
import CookieConsentBanner from './CookieConsentBanner';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

/** 管理控制台 / 运行观测台：自带侧栏与顶栏，不再套主站 Navbar 与页脚 */
function isConsolePath(pathname: string): boolean {
  const staffLogin = pathname === '/admin/login' || pathname === '/ops/login';
  if (staffLogin) {
    return false;
  }
  return pathname.startsWith('/admin') || pathname.startsWith('/ops');
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const staffLogin = pathname === '/admin/login' || pathname === '/ops/login';

  if (staffLogin || isConsolePath(pathname)) {
    return <div className="min-h-screen bg-slate-950">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {user && <Navbar />}

      <main className={`flex-1 ${user ? 'pb-16 md:pb-0' : ''}`}>{children}</main>

      <AppFooter />
      <CookieConsentBanner />
    </div>
  );
}
