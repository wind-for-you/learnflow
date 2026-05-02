import { Link } from 'react-router-dom';
import LegalNotice from './LegalNotice';

export default function AiTransparencyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pb-28">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/login" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-6 inline-block">
          返回登录
        </Link>
        <h1 className="text-3xl font-bold mb-2">AI 功能说明（占位）</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">版本：模板 v0 · 更新日：待定</p>
        <LegalNotice />
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-4 text-sm leading-relaxed">
          <p>LearnFlow 部分功能使用大语言模型生成学习计划、复盘摘要或建议。</p>
          <h2 className="text-lg font-semibold pt-2">您提供的内容</h2>
          <p>为生成结果，服务端可能将您输入的目标、任务上下文等发送至所配置的模型服务；请勿提交机密或敏感个人信息。</p>
          <h2 className="text-lg font-semibold pt-2">准确性与责任</h2>
          <p>AI 输出可能存在错误或不完整，请自行核实；重要决策请咨询具备资质的专业人士。</p>
          <h2 className="text-lg font-semibold pt-2">模型与日志</h2>
          <p>供应商侧日志与保留策略以其公开文档为准；我们尽量最小化传输字段并记录用于排错与计费的聚合指标。</p>
        </div>
      </div>
    </div>
  );
}
