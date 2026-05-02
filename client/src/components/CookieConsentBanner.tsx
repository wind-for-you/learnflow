import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'lf_trust_consent_v1';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none"
      role="dialog"
      aria-label="隐私与本地存储说明"
    >
      <div className="max-w-3xl mx-auto pointer-events-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
        <p className="mb-3">
          我们使用浏览器本地存储保存登录令牌，并可能发送匿名产品使用事件以改进体验。详见
          <Link to="/legal/privacy" className="text-indigo-600 dark:text-indigo-400 mx-1 underline">
            隐私政策
          </Link>
          。
        </p>
        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={dismiss} className="btn-primary text-xs py-1.5 px-3">
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
