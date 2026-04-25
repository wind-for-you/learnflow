import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  SparklesIcon, 
  ClockIcon, 
  CalendarDaysIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { goalApi, planApi } from '../services/api';
import MermaidRenderer from './MermaidRenderer';
import type { Goal, Plan, GeneratePlanRequest, WeeklyPlan } from '../types';

export default function PlannerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { } = useAuth();

  // 状态管理
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPlanForm, setShowPlanForm] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState<GeneratePlanRequest>({
    goalId: '',
    goal: '',
    currentLevel: 'beginner',
    hoursPerWeek: 10,
    durationWeeks: 4,
    preferredStyle: 'mixed',
    specificRequirements: '',
  });

  // 从 URL 参数获取目标 ID 和来源页面
  const goalIdFromUrl = searchParams.get('goalId');
  const fromUrl = searchParams.get('from') || '/dashboard';

  // 加载用户目标
  useEffect(() => {
    loadGoals();
  }, []);

  // 如果 URL 中有目标 ID，自动选择该目标
  useEffect(() => {
    if (goalIdFromUrl && goals.length > 0) {
      const goal = goals.find(g => g.id === goalIdFromUrl);
      if (goal) {
        setSelectedGoal(goal);
        setFormData(prev => ({
          ...prev,
          goalId: goal.id,
          goal: goal.title,
        }));
        setShowPlanForm(true);
      }
    }
  }, [goalIdFromUrl, goals]);

  const loadGoals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await goalApi.getGoals({ status: 'ACTIVE' });
      setGoals(response.goals);
      
      // 如果没有目标，提示用户创建
      if (response.goals.length === 0) {
        setError(null); // 清除错误，这不是错误状态
      }
    } catch (error: any) {
      console.error('加载目标失败:', error);
      setError('加载目标失败：' + (error.message || '请检查网络连接'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoalSelect = (goal: Goal) => {
    setSelectedGoal(goal);
    setFormData(prev => ({
      ...prev,
      goalId: goal.id,
      goal: goal.title,
    }));
    setShowPlanForm(true);
    setGeneratedPlan(null);
    setError(null);
  };

  const handleFormChange = (field: keyof GeneratePlanRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGeneratePlan = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setNotice(null);

      // 验证表单
      if (!formData.goal.trim()) {
        setError('请输入学习目标');
        return;
      }

      if (formData.hoursPerWeek < 1 || formData.hoursPerWeek > 168) {
        setError('每周学习时间必须在1-168小时之间');
        return;
      }

      if (formData.durationWeeks < 1 || formData.durationWeeks > 52) {
        setError('计划持续时间必须在1-52周之间');
        return;
      }

      // 检查该目标是否已有计划（一个目标一个计划原则）
      if (selectedGoal) {
        try {
          const existingPlansResponse = await planApi.getPlans(selectedGoal.id);
          if (existingPlansResponse.plans && existingPlansResponse.plans.length > 0) {
            const confirmUpdate = confirm(
              `该目标已有 ${existingPlansResponse.plans.length} 个学习计划。\n\n根据"一个目标一个计划"的原则，新生成的计划将替换现有计划。\n\n确认继续生成新计划吗？`
            );
            
            if (!confirmUpdate) {
              setIsGenerating(false);
              return;
            }

            // 删除现有计划（实现一个目标一个计划）
            console.log('正在删除现有计划...');
            for (const plan of existingPlansResponse.plans) {
              try {
                await planApi.deletePlan(plan.id);
                console.log(`已删除计划: ${plan.title}`);
              } catch (deleteError) {
                console.error(`删除计划失败: ${plan.title}`, deleteError);
              }
            }
          }
        } catch (error) {
          console.warn('检查现有计划失败，继续生成新计划:', error);
        }
      }

      const response = await planApi.generatePlan(formData);
      console.log('生成的计划响应:', response);
      console.log('计划对象:', response.plan);
      console.log('Mermaid代码:', response.plan.mermaidCode);
      console.log('转换后的Mermaid代码:', response.plan.mermaidCode?.replace(/\\n/g, '\n'));
      
      setGeneratedPlan(response.plan);
      if (response.plan.isFallback) {
        setNotice(response.plan.fallbackReason || response.message || 'AI 当前不可用，已自动生成模板学习计划');
      }
      
      // 如果计划生成成功，可以选择跳转到计划详情页
      // navigate(`/plans/${response.plan.id}`);
    } catch (error: any) {
      console.error('生成计划失败:', error);
      setError(error.message || '生成计划失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePlan = async () => {
    if (!generatedPlan) return;
    
    try {
      // 计划已经在生成时保存到数据库了，这里只需要给用户反馈
      alert('计划保存成功！您可以在目标列表中查看您的学习计划。');
      
      // 可以选择跳转到目标列表或dashboard
      const from = searchParams.get('from');
      if (from === '/goals') {
        navigate('/goals');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('保存计划失败:', error);
      alert('保存计划失败，请重试');
    }
  };

  // 切换周计划展开状态
  const toggleWeekExpanded = (weekNumber: number) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekNumber)) {
      newExpanded.delete(weekNumber);
    } else {
      newExpanded.add(weekNumber);
    }
    setExpandedWeeks(newExpanded);
  };

  // 查看完整计划
  const handleViewFullPlan = () => {
    if (generatedPlan) {
      navigate(`/plans/${generatedPlan.id}`);
    }
  };

  const handleBackToGoals = () => {
    setShowPlanForm(false);
    setSelectedGoal(null);
    setGeneratedPlan(null);
    setError(null);
  };



  // 如果正在加载目标
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">正在加载您的目标...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <button
            onClick={() => navigate(fromUrl)}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            {fromUrl === '/goals' ? '返回目标列表' : '返回仪表板'}
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI 学习计划生成器
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            基于您的目标和偏好，智能生成个性化学习计划
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-error-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-error-800 dark:text-error-200">
                  生成失败
                </h3>
                <p className="mt-1 text-sm text-error-700 dark:text-error-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {notice && (
          <div className="mb-6 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-warning-500 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-warning-800 dark:text-warning-200">
                  已启用模板降级
                </h3>
                <p className="mt-1 text-sm text-warning-700 dark:text-warning-300">{notice}</p>
              </div>
            </div>
          </div>
        )}

        {!showPlanForm ? (
          /* 目标选择界面 */
          <div className="space-y-6">
            {/* 创建新目标按钮 */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                选择学习目标
              </h2>
              <button
                onClick={() => navigate('/goals/new')}
                className="btn-primary"
              >
                创建新目标
              </button>
            </div>

            {/* 目标列表 */}
            {goals.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  暂无学习目标
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  创建您的第一个学习目标，开始制定AI学习计划
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/goals/new')}
                    className="btn-primary"
                  >
                    创建目标
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map((goal) => (
                  <div
                    key={goal.id}
                    className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() => handleGoalSelect(goal)}
                  >
                    <div className="card-body">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                          {goal.description}
                        </p>
                      )}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <ChartBarIcon className="h-4 w-4 mr-1" />
                          进度 {goal.progress}%
                        </div>
                        <span className={`badge ${
                          goal.status === 'ACTIVE' ? 'badge-success' : 
                          goal.status === 'COMPLETED' ? 'badge-primary' : 
                          'badge-warning'
                        }`}>
                          {goal.status === 'ACTIVE' ? '进行中' : 
                           goal.status === 'COMPLETED' ? '已完成' : 
                           goal.status === 'PAUSED' ? '暂停' : '已取消'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* 计划生成界面 */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左侧：表单 */}
            <div className="space-y-6">
              {/* 返回按钮 */}
              <button
                onClick={handleBackToGoals}
                className="btn-outline text-sm"
              >
                ← 返回目标选择
              </button>

              {/* 选中的目标 */}
              {selectedGoal && (
                <div className="card">
                  <div className="card-body">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      当前目标
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {selectedGoal.title}
                    </p>
                    {selectedGoal.description && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {selectedGoal.description}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 生成表单 */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    学习计划配置
                  </h3>
                </div>
                <div className="card-body space-y-6">
                  {/* 学习目标描述 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      学习目标描述
                    </label>
                    <textarea
                      value={formData.goal}
                      onChange={(e) => handleFormChange('goal', e.target.value)}
                      rows={3}
                      className="input"
                      placeholder="详细描述您想要学习的内容和目标..."
                    />
                  </div>

                  {/* 当前水平 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      当前水平
                    </label>
                    <select
                      value={formData.currentLevel}
                      onChange={(e) => handleFormChange('currentLevel', e.target.value)}
                      className="input"
                    >
                      <option value="beginner">初学者</option>
                      <option value="intermediate">中级</option>
                      <option value="advanced">高级</option>
                    </select>
                  </div>

                  {/* 每周学习时间 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      每周学习时间
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={formData.hoursPerWeek}
                        onChange={(e) => handleFormChange('hoursPerWeek', parseInt(e.target.value))}
                        className="input w-24"
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-400">小时/周</span>
                    </div>
                  </div>

                  {/* 计划持续时间 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      计划持续时间
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="52"
                        value={formData.durationWeeks}
                        onChange={(e) => handleFormChange('durationWeeks', parseInt(e.target.value))}
                        className="input w-24"
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-400">周</span>
                    </div>
                  </div>

                  {/* 学习风格 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      学习风格偏好
                    </label>
                    <select
                      value={formData.preferredStyle}
                      onChange={(e) => handleFormChange('preferredStyle', e.target.value)}
                      className="input"
                    >
                      <option value="practical">实践为主</option>
                      <option value="theoretical">理论为主</option>
                      <option value="mixed">理论实践结合</option>
                    </select>
                  </div>

                  {/* 特殊要求 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      特殊要求（可选）
                    </label>
                    <textarea
                      value={formData.specificRequirements}
                      onChange={(e) => handleFormChange('specificRequirements', e.target.value)}
                      rows={3}
                      className="input"
                      placeholder="任何特殊的学习要求或偏好..."
                    />
                  </div>

                  {/* 生成按钮 */}
                  <button
                    onClick={handleGeneratePlan}
                    disabled={isGenerating || !formData.goal.trim()}
                    className="w-full btn-primary py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <div className="flex items-center justify-center">
                        <div className="spinner w-5 h-5 mr-2" />
                        AI 正在生成计划...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        生成学习计划
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 右侧：预览 */}
            <div className="space-y-6">
              {generatedPlan ? (
                /* 生成的计划预览 */
                <div className="space-y-6">
                  {/* 计划概要 */}
                  <div className="card">
                    <div className="card-header">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {generatedPlan.title}
                      </h3>
                    </div>
                    <div className="card-body">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center">
                          <CalendarDaysIcon className="h-4 w-4 mr-2 text-gray-400" />
                          持续 {generatedPlan.durationWeeks} 周
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                          每周 {formData.hoursPerWeek} 小时
                        </div>
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="mt-4 space-y-2">
                        <button
                          onClick={handleViewFullPlan}
                          className="btn-primary w-full"
                        >
                          查看完整计划
                        </button>
                        <button
                          onClick={handleSavePlan}
                          className="btn-success w-full"
                        >
                          保存并返回
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 流程图 */}
                  {generatedPlan.mermaidCode && (
                    <div className="card">
                      <div className="card-header">
                        <h4 className="text-base font-medium text-gray-900 dark:text-white">
                          学习流程图
                        </h4>
                      </div>
                      <div className="card-body">
                        <MermaidRenderer 
                          code={generatedPlan.mermaidCode?.replace(/\\n/g, '\n') || ''}
                          theme="default"
                        />
                      </div>
                    </div>
                  )}

                  {/* 周计划概览 */}
                  {generatedPlan.weeklyPlans && (
                    <div className="card">
                      <div className="card-header">
                        <h4 className="text-base font-medium text-gray-900 dark:text-white">
                          学习计划概览
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          点击周计划查看详细任务安排
                        </p>
                      </div>
                      <div className="card-body">
                        <div className="space-y-3">
                          {(generatedPlan.weeklyPlans as WeeklyPlan[]).map((week, index) => (
                            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                              {/* 周计划头部 - 可点击展开 */}
                              <div 
                                className="p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                onClick={() => toggleWeekExpanded(week.week)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center">
                                      <div className="flex items-center text-sm font-medium text-primary-600 dark:text-primary-400">
                                        <CalendarDaysIcon className="h-4 w-4 mr-1" />
                                        第 {week.week} 周
                                      </div>
                                      <div className="mx-2 text-gray-300">•</div>
                                      <h5 className="font-medium text-gray-900 dark:text-white">
                                        {week.title}
                                      </h5>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                                      {week.description}
                                    </p>
                                  </div>
                                  <div className="ml-4 flex items-center text-gray-400">
                                    {expandedWeeks.has(week.week) ? (
                                      <ChevronDownIcon className="h-5 w-5" />
                                    ) : (
                                      <ChevronRightIcon className="h-5 w-5" />
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 展开的内容 */}
                              {expandedWeeks.has(week.week) && (
                                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                                  {/* 本周目标 */}
                                  {week.goals && week.goals.length > 0 && (
                                    <div className="mb-4">
                                      <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        🎯 本周目标
                                      </h6>
                                      <ul className="space-y-1">
                                        {week.goals.map((goal, goalIndex) => (
                                          <li key={goalIndex} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                                            <CheckCircleIcon className="h-4 w-4 mt-0.5 mr-2 text-green-500 flex-shrink-0" />
                                            {goal}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* 每日任务 */}
                                  {week.tasks && week.tasks.length > 0 && (
                                    <div>
                                      <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                        📋 每日任务安排
                                      </h6>
                                      <div className="grid gap-2">
                                        {week.tasks.map((task, taskIndex) => (
                                          <div key={taskIndex} className="flex items-start p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                                            <div className="flex-shrink-0 w-16 text-center">
                                              <div className="text-xs font-medium text-primary-600 dark:text-primary-400">
                                                第{task.day}天
                                              </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {task.title}
                                              </div>
                                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                {task.description}
                                              </div>
                                              <div className="flex items-center mt-2 text-xs text-gray-500">
                                                <ClockIcon className="h-3 w-3 mr-1" />
                                                预计 {task.estimatedTime} 分钟
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* 查看更多提示 */}
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex items-center text-sm text-blue-700 dark:text-blue-300">
                            <DocumentTextIcon className="h-4 w-4 mr-2" />
                            点击上方"查看完整计划"可进入详细管理页面，进行任务跟踪和进度管理
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* 等待生成的占位符 */
                <div className="card">
                  <div className="card-body text-center py-12">
                    <SparklesIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      AI 学习计划生成器
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      填写左侧表单，让AI为您生成个性化的学习计划
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  );
}
