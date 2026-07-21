import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { reviewApi, planApi, adaptiveApi } from '../services/api';
import { useToast } from './Toast';
import type { Review, Plan, AdaptiveSuggestion } from '../types';
import { track } from '../utils/productAnalytics';

type PeriodFilter = 'all' | 'weekly' | 'monthly' | 'quarterly';

const PERIOD_LABELS: Record<string, string> = {
  weekly: '周复盘',
  monthly: '月复盘',
  quarterly: '季度复盘',
};

const PERIOD_BADGE_COLORS: Record<string, string> = {
  weekly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  monthly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  quarterly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const FILTER_TABS: { key: PeriodFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'weekly', label: '周复盘' },
  { key: 'monthly', label: '月复盘' },
  { key: 'quarterly', label: '季度复盘' },
];

const STATUS_LABELS: Record<AdaptiveSuggestion['status'], string> = {
  on_track: '进度正常',
  falling_behind: '略有落后',
  ahead: '进度领先',
};

export default function ReviewPage() {
  const toast = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<PeriodFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formPeriod, setFormPeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('weekly');
  const [formContent, setFormContent] = useState('');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [adaptiveSuggestion, setAdaptiveSuggestion] = useState<AdaptiveSuggestion | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      const period = filter === 'all' ? undefined : filter;
      const response = await reviewApi.getReviews(period);
      setReviews(response.reviews);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载复盘记录失败';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    void planApi.getPlans().then(({ plans: planList }) => {
      setPlans(planList);
      if (planList.length > 0) {
        setSelectedPlanId((current) => current || planList[0].id);
      }
    }).catch(() => {
      setPlans([]);
    });
  }, []);

  const handleAnalyzePlan = async () => {
    if (!selectedPlanId) {
      toast.error('请先选择学习计划');
      return;
    }
    try {
      setIsAnalyzing(true);
      const suggestion = await adaptiveApi.analyze(selectedPlanId);
      setAdaptiveSuggestion(suggestion);
      toast.success('已生成计划调整建议');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '获取调整建议失败';
      toast.error(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreate = async () => {
    if (!formContent.trim()) {
      toast.error('请输入复盘内容');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await reviewApi.createReview({
        period: formPeriod,
        content: formContent.trim(),
      });
      setReviews(prev => [response.review, ...prev]);
      track('review_created', { period: formPeriod });
      toast.success(response.message || '复盘创建成功');
      setShowForm(false);
      setFormContent('');
      setFormPeriod('weekly');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '创建复盘失败';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateAIContent = async () => {
    try {
      setIsGeneratingAI(true);
      const summary = await reviewApi.generateAISummary(formPeriod);
      const generatedContent = [
        `【总结】${summary.summary}`,
        '',
        '【亮点】',
        ...summary.highlights.map(item => `- ${item}`),
        '',
        '【建议】',
        ...summary.suggestions.map(item => `- ${item}`),
      ].join('\n');

      setFormContent(generatedContent);
      toast.success(summary.isFallback ? '已生成基础复盘草稿（回退模式）' : 'AI 复盘草稿生成成功');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI 生成复盘失败';
      toast.error(msg);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条复盘记录吗？此操作不可撤销。')) return;

    try {
      setDeletingId(id);
      await reviewApi.deleteReview(id);
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success('复盘记录已删除');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '删除失败';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">学习复盘</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">定期回顾学习成果，持续优化学习方法</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary self-start sm:self-auto"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          新建复盘
        </button>
      </div>

      {plans.length > 0 && (
        <div className="card mb-8 border border-primary-200 dark:border-primary-900/40">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-primary-600" />
              学习计划调整建议
            </h2>
          </div>
          <div className="card-body space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="input flex-1"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.title}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleAnalyzePlan()}
                disabled={isAnalyzing || !selectedPlanId}
                className="btn-primary whitespace-nowrap disabled:opacity-50"
              >
                {isAnalyzing ? '分析中…' : '获取 AI 调整建议'}
              </button>
            </div>

            {adaptiveSuggestion && (
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {STATUS_LABELS[adaptiveSuggestion.status]}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    完成率 {adaptiveSuggestion.completionRate}%
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{adaptiveSuggestion.suggestion}</p>
                {adaptiveSuggestion.adjustments.length > 0 && (
                  <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    {adaptiveSuggestion.adjustments.slice(0, 3).map((item) => (
                      <li key={`${item.week}-${item.action}`}>
                        第 {item.week} 周：{item.action === 'reduce' ? '减量' : item.action === 'increase' ? '加量' : '保持'} — {item.reason}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to={`/plans/${selectedPlanId}`}
                  className="inline-block text-sm text-primary-600 hover:text-primary-500"
                >
                  去计划页执行任务 →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">新建复盘</h2>
              <button
                onClick={() => { setShowForm(false); setFormContent(''); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  复盘周期
                </label>
                <select
                  value={formPeriod}
                  onChange={e => setFormPeriod(e.target.value as typeof formPeriod)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="weekly">周复盘</option>
                  <option value="monthly">月复盘</option>
                  <option value="quarterly">季度复盘</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  复盘内容
                </label>
                <div className="flex justify-end mb-2">
                  <button
                    onClick={handleGenerateAIContent}
                    disabled={isGeneratingAI || isSubmitting}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-primary-300 text-primary-700 bg-primary-50 hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-primary-700 dark:text-primary-300 dark:bg-primary-900/20 dark:hover:bg-primary-900/40"
                    type="button"
                  >
                    {isGeneratingAI ? (
                      <>
                        <span className="spinner w-3 h-3 mr-1.5" />
                        AI 生成中...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-4 w-4 mr-1.5" />
                        AI 生成复盘草稿
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  rows={6}
                  placeholder="回顾这段时间的学习成果、遇到的问题和改进方向..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setShowForm(false); setFormContent(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting || !formContent.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <span className="spinner w-4 h-4 mr-2" />
                    创建中...
                  </span>
                ) : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Period filter tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              filter === tab.key
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-700'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="spinner w-8 h-8 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">正在加载复盘记录...</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && reviews.length === 0 && (
        <div className="text-center py-16">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
            {filter === 'all' ? '暂无复盘记录' : `暂无${PERIOD_LABELS[filter]}记录`}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            定期复盘有助于提升学习效果
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              新建复盘
            </button>
          )}
        </div>
      )}

      {/* Review cards list */}
      {!isLoading && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map(review => (
            <div
              key={review.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PERIOD_BADGE_COLORS[review.period]}`}>
                      {PERIOD_LABELS[review.period]}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(review.createdAt), 'yyyy-MM-dd HH:mm')}
                    </span>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap line-clamp-4">
                    {review.content}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(review.id)}
                  disabled={deletingId === review.id}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                  title="删除复盘"
                >
                  {deletingId === review.id ? (
                    <span className="spinner w-5 h-5" />
                  ) : (
                    <TrashIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
