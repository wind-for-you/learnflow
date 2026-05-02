import { Link } from 'react-router-dom';

export default function AppFooter() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="text-gray-400 dark:text-gray-500">LearnFlow</span>
        <Link to="/legal/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400">
          隐私政策
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/legal/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400">
          服务条款
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/legal/ai" className="hover:text-indigo-600 dark:hover:text-indigo-400">
          AI 说明
        </Link>
      </div>
    </footer>
  );
}
