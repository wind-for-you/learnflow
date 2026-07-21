import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  BookOpenIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import UserMenu from './UserMenu';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';

export default function Navbar() {
  const location = useLocation();
  const { user } = useAuth();
  const { isDark, toggle } = useTheme();

  const navigationLinks = [
    { name: '今日', href: '/dashboard', icon: HomeIcon },
    { name: '目标', href: '/goals', icon: BookOpenIcon },
    { name: '计划', href: '/plans', icon: DocumentTextIcon },
    { name: '复盘', href: '/reviews', icon: ClipboardDocumentCheckIcon },
    { name: '我的', href: '/profile', icon: UserIcon },
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  if (!user) return null;

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">LF</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
                LearnFlow
              </span>
            </Link>

            <div className="hidden md:ml-8 md:flex md:space-x-1">
              {navigationLinks.map((link) => {
                const Icon = link.icon;
                const isActive = isActiveRoute(link.href);
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
            >
              {isDark ? '🌙' : '☀️'}
            </button>
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="md:hidden border-t border-gray-200 dark:border-gray-800">
        <div className="px-2 py-2 flex space-x-1 overflow-x-auto">
          {navigationLinks.map((link) => {
            const Icon = link.icon;
            const isActive = isActiveRoute(link.href);
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`flex-shrink-0 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium ${
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-1" />
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
