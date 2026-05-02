import Navbar from './Navbar';
import AppFooter from './AppFooter';
import CookieConsentBanner from './CookieConsentBanner';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {user && <Navbar />}

      <main className={`flex-1 ${user ? 'pb-16 md:pb-0' : ''}`}>{children}</main>

      <AppFooter />
      <CookieConsentBanner />
    </div>
  );
}
