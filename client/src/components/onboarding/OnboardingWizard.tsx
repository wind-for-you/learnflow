import { useState, useEffect, useCallback } from 'react';
import {
  XMarkIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import type { GeneratePlanRequest, Plan, Task, User } from '../../types';
import { goalApi, planApi, authApi } from '../../services/api';
import { track, flushQueue } from '../../utils/productAnalytics';
import {
  loadOnboardingProgress,
  saveOnboardingProgress,
  clearOnboardingProgress,
  type OnboardingStep,
} from '../../utils/onboardingLocal';

export interface OnboardingWizardProps {
  open: boolean;
  userId: string;
  onFinished: (user: User) => void;
}

function initialPlanForm(goalId: string, goalTitle: string): GeneratePlanRequest {
  return {
    goalId,
    goal: goalTitle,
    currentLevel: 'beginner',
    hoursPerWeek: 10,
    durationWeeks: 4,
    preferredStyle: 'mixed',
    specificRequirements: '',
  };
}

export default function OnboardingWizard({ open, userId, onFinished }: OnboardingWizardProps) {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [planForm, setPlanForm] = useState<GeneratePlanRequest | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<Plan | null>(null);
  const [tasksPreview, setTasksPreview] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetLocalState = useCallback(() => {
    setStep(1);
    setGoalTitle('');
    setGoalDescription('');
    setPlanForm(null);
    setGeneratedPlan(null);
    setTasksPreview([]);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetLocalState();
    }
  }, [open, resetLocalState]);

  useEffect(() => {
    if (!open) return;
    const saved = loadOnboardingProgress(userId);
    if (!saved) {
      setStep(1);
      return;
    }
    if (saved.step === 2 && saved.goalId) {
      setStep(2);
      void goalApi
        .getGoal(saved.goalId)
        .then(({ goal }) => {
          setGoalTitle(goal.title);
          setPlanForm(initialPlanForm(goal.id, goal.title));
        })
        .catch(() => {
          clearOnboardingProgress(userId);
          setStep(1);
        });
      return;
    }
    if (saved.step === 3 && saved.planId) {
      setStep(3);
      void planApi
        .getPlan(saved.planId)
        .then(({ plan }) => {
          setGeneratedPlan(plan);
          setTasksPreview((plan.tasks || []).slice(0, 8));
          if (plan.goal?.title) setGoalTitle(plan.goal.title);
        })
        .catch(() => {
          clearOnboardingProgress(userId);
          setStep(1);
        });
    }
  }, [open, userId]);

  useEffect(() => {
    if (!open) return;
    if (step === 1) track('onboarding_step_goal', {});
    if (step === 2) track('onboarding_step_plan', {});
    if (step === 3) track('onboarding_step_tasks', {});
  }, [open, step]);

  const finishServer = useCallback(
    async (opts: { skipped: boolean; legacy?: boolean }) => {
      await flushQueue();
      const { user } = await authApi.finishOnboarding({
        skipped: opts.skipped,
        legacyHasGoals: Boolean(opts.legacy),
      });
      clearOnboardingProgress(userId);
      if (!opts.legacy) {
        if (opts.skipped) {
          track('onboarding_skipped', { step });
        } else {
          track('onboarding_completed', {});
        }
      }
      await flushQueue();
      onFinished(user);
    },
    [onFinished, userId, step],
  );

  const handleSkip = () => {
    setLoading(true);
    void finishServer({ skipped: true })
      .catch(() => setError('暂时无法保存状态，请稍后重试'))
      .finally(() => setLoading(false));
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = goalTitle.trim();
    if (t.length < 2) {
      setError('目标标题至少 2 个字');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { goal } = await goalApi.createGoal({
        title: t,
        description: goalDescription.trim() || undefined,
      });
      setPlanForm(initialPlanForm(goal.id, goal.title));
      saveOnboardingProgress(userId, { step: 2, goalId: goal.id });
      setStep(2);
    } catch {
      setError('创建目标失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!planForm) return;
    setError(null);
    setLoading(true);
    try {
      const { plan } = await planApi.generatePlan(planForm);
      setGeneratedPlan(plan);
      setTasksPreview((plan.tasks || []).slice(0, 8));
      saveOnboardingProgress(userId, { step: 3, goalId: plan.goalId, planId: plan.id });
      setStep(3);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : '';
      setError(msg || '生成计划失败，可稍后到「学习计划」重试');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    setLoading(true);
    void finishServer({ skipped: false })
      .catch(() => setError('保存完成状态失败'))
      .finally(() => setLoading(false));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
        <button
          type="button"
          onClick={() => void handleSkip()}
          disabled={loading}
          className="absolute right-3 top-3 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="关闭并跳过引导"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        <div className="p-6 pt-12">
          <div className="flex items-center gap-2 mb-1">
            <SparklesIcon className="h-6 w-6 text-indigo-500" />
            <h2 id="onboarding-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              首启引导（约 10 分钟）
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            步骤 {step} / 3：{step === 1 ? '创建第一个目标' : step === 2 ? '生成学习计划' : '查看入门任务'}
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-200">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">学习目标标题</label>
                <input
                  className="input w-full"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="例如：三个月内掌握 TypeScript 基础"
                  maxLength={120}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">补充说明（可选）</label>
                <textarea
                  className="input w-full min-h-[80px]"
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  placeholder="当前水平、可用时间等"
                  maxLength={500}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? '创建中…' : '下一步'}
                </button>
                <button type="button" disabled={loading} onClick={() => void handleSkip()} className="btn-outline">
                  跳过引导
                </button>
              </div>
            </form>
          )}

          {step === 2 && planForm && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                已选目标：<span className="font-medium text-gray-900 dark:text-white">{goalTitle}</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">当前水平</label>
                  <select
                    className="input w-full text-sm"
                    value={planForm.currentLevel}
                    onChange={(e) =>
                      setPlanForm((p) =>
                        p ? { ...p, currentLevel: e.target.value as GeneratePlanRequest['currentLevel'] } : p,
                      )
                    }
                  >
                    <option value="beginner">入门</option>
                    <option value="intermediate">进阶</option>
                    <option value="advanced">高级</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">每周学习（小时）</label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    className="input w-full text-sm"
                    value={planForm.hoursPerWeek}
                    onChange={(e) =>
                      setPlanForm((p) => (p ? { ...p, hoursPerWeek: Number(e.target.value) || 1 } : p))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">计划周期（周）</label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    className="input w-full text-sm"
                    value={planForm.durationWeeks}
                    onChange={(e) =>
                      setPlanForm((p) => (p ? { ...p, durationWeeks: Number(e.target.value) || 1 } : p))
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="button" disabled={loading} onClick={() => void handleGeneratePlan()} className="btn-primary inline-flex items-center gap-2">
                  <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? '生成中…' : '生成学习计划'}
                </button>
                <button type="button" disabled={loading} onClick={() => void handleSkip()} className="btn-outline">
                  跳过引导
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {generatedPlan?.isFallback && (
                <p className="text-sm text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                  {generatedPlan.fallbackReason || '已使用模板计划，可稍后在「学习计划」中调整。'}
                </p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-300">
                计划「<span className="font-medium">{generatedPlan?.title}</span>」已保存。下面是从第一周抽取的部分任务：
              </p>
              <ul className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {tasksPreview.length === 0 ? (
                  <li className="px-3 py-3 text-gray-500">暂无任务条目，可在任务列表中查看。</li>
                ) : (
                  tasksPreview.map((t) => (
                    <li key={t.id} className="px-3 py-2 flex justify-between gap-2 text-gray-800 dark:text-gray-200">
                      <span>{t.title}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        第{t.week}周·第{t.day}天
                      </span>
                    </li>
                  ))
                )}
              </ul>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="button" disabled={loading} onClick={() => void handleComplete()} className="btn-primary inline-flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4" />
                  完成引导
                </button>
                <button type="button" disabled={loading} onClick={() => void handleSkip()} className="btn-outline">
                  跳过引导
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
