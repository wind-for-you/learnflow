import { Link } from 'react-router-dom';
import LegalNotice from './LegalNotice';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pb-28">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/login" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-6 inline-block">
          返回登录
        </Link>
        <h1 className="text-3xl font-bold mb-2">隐私政策（占位）</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">版本：模板 v0 · 更新日：待定</p>
        <LegalNotice />
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-4 text-sm leading-relaxed">
          <p>我们重视您的隐私。本页描述我们如何收集、使用与保护与您使用 LearnFlow 相关的信息。</p>
          <h2 className="text-lg font-semibold pt-2">我们可能收集的信息</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>账户信息：邮箱、显示名（用于注册与登录）。</li>
            <li>学习数据：目标、计划、任务、打卡与复盘等您主动创建的内容。</li>
            <li>产品与诊断数据：为改进产品，我们可能记录匿名或聚合的使用情况（详见埋点说明）。</li>
          </ul>
          <h2 className="text-lg font-semibold pt-2">本地存储与 Cookie</h2>
          <p>
            登录态可能保存在浏览器本地存储（localStorage）以便保持会话。当前实现不将 JWT 写入 Cookie；若后续启用
            Cookie，将在此页更新说明并配合 Cookie 提示条。
          </p>
          <h2 className="text-lg font-semibold pt-2">第三方与 AI 服务</h2>
          <p>若您使用 AI 相关能力，部分请求可能经服务端转发至配置的模型供应商；处理范围以届时数据处理协议为准。</p>
          <h2 className="text-lg font-semibold pt-2">您的权利</h2>
          <p>您可在产品内导出个人数据副本，并申请注销账号；注销后我们将按策略限制登录并匿名化标识字段。</p>
        </div>
      </div>
    </div>
  );
}
