import { Link } from 'react-router-dom';
import LegalNotice from './LegalNotice';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pb-28">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/login" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-6 inline-block">
          返回登录
        </Link>
        <h1 className="text-3xl font-bold mb-2">服务条款（占位）</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">版本：模板 v0 · 更新日：待定</p>
        <LegalNotice />
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-4 text-sm leading-relaxed">
          <p>使用 LearnFlow 即表示您同意遵守下列条款（占位）。</p>
          <h2 className="text-lg font-semibold pt-2">服务说明</h2>
          <p>LearnFlow 提供学习目标管理与辅助工具；AI 生成内容仅供参考，不构成专业建议。</p>
          <h2 className="text-lg font-semibold pt-2">账户与安全</h2>
          <p>您应妥善保管凭据；因您自身原因导致的账户风险由您自行承担。</p>
          <h2 className="text-lg font-semibold pt-2">变更与终止</h2>
          <p>我们可能因维护或合规要求调整服务；重大变更将通过产品内通知或邮件告知（若适用）。</p>
        </div>
      </div>
    </div>
  );
}
