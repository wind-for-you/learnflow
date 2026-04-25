import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, addWeeks } from 'date-fns';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { goalApi } from '../services/api';
import type { Goal, GoalFormData } from '../types';

export default function GoalFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  // 状态管理
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingGoal, setExistingGoal] = useState<Goal | null>(null);

  // 表单状态
  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    description: '',
    targetDate: format(addWeeks(new Date(), 4), 'yyyy-MM-dd'), // 默认4周后
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 加载现有目标（编辑模式）
  useEffect(() => {
    if (isEdit && id) {
      loadGoal(id);
    }
  }, [isEdit, id]);

  const loadGoal = async (goalId: string) => {
    try {
      setIsLoading(true);
      const response = await goalApi.getGoal(goalId);
      const goal = response.goal;
      
      setExistingGoal(goal);
      setFormData({
        title: goal.title,
        description: goal.description || '',
        targetDate: goal.targetDate ? format(new Date(goal.targetDate), 'yyyy-MM-dd') : '',
      });
    } catch (error: any) {
      console.error('加载目标失败:', error);
      setError('加载目标信息失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 表单验证
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = '目标标题不能为空';
    } else if (formData.title.trim().length < 2) {
      errors.title = '目标标题至少需要2个字符';
    } else if (formData.title.trim().length > 200) {
      errors.title = '目标标题不能超过200个字符';
    }

    if (formData.description && formData.description.length > 1000) {
      errors.description = '目标描述不能超过1000个字符';
    }

    if (formData.targetDate) {
      const targetDate = new Date(formData.targetDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (targetDate < today) {
        errors.targetDate = '目标日期不能早于今天';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // 处理空的目标日期
      const submitData = {
        ...formData,
        targetDate: formData.targetDate || undefined,
      };

      if (isEdit && existingGoal) {
        // 更新现有目标
        await goalApi.updateGoal(existingGoal.id, submitData);
        navigate('/goals');
      } else {
        // 创建新目标
        const response = await goalApi.createGoal(submitData);
        // 创建成功后可以选择跳转到AI规划页面
        navigate(`/planner?goalId=${response.goal.id}`);
      }
    } catch (error: any) {
      console.error('保存目标失败:', error);
      setError(error.message || (isEdit ? '更新目标失败，请重试' : '创建目标失败，请重试'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (field: keyof GoalFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除对应字段的错误
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // 清除全局错误
    if (error) {
      setError(null);
    }
  };

  // 快速目标模板
  const goalTemplates = [
    {
      title: '学习 JavaScript 编程',
      description: '从零开始学习 JavaScript，掌握基础语法、DOM操作和异步编程',
    },
    {
      title: '掌握 React 框架',
      description: '学习 React 组件开发、状态管理和项目构建',
    },
    {
      title: '提升英语口语能力',
      description: '通过日常练习和对话，提高英语口语表达能力',
    },
    {
      title: '学习数据分析',
      description: '掌握数据分析的基本方法和工具，提升数据洞察能力',
    },
  ];

  const handleTemplateClick = (template: typeof goalTemplates[0]) => {
    setFormData(prev => ({
      ...prev,
      title: template.title,
      description: template.description,
    }));
  };

  // 直接创建AI计划
  const handleCreateWithAI = () => {
    if (!validateForm()) {
      return;
    }
    
    // 先创建目标，然后跳转到AI规划
    handleSubmit(new Event('submit') as any);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">正在加载目标信息...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            返回仪表板
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEdit ? '编辑学习目标' : '创建学习目标'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {isEdit 
              ? '修改您的学习目标信息'
              : '设定明确的学习目标，开始您的成长之旅'
            }
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-error-800 dark:text-error-200">
                  操作失败
                </h3>
                <p className="mt-1 text-sm text-error-700 dark:text-error-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：表单 */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  目标信息
                </h2>
              </div>
              
              <form onSubmit={handleSubmit} className="card-body space-y-6">
                {/* 目标标题 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    目标标题 <span className="text-error-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <BookOpenIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className={`input flex-1 ${formErrors.title ? 'border-error-300 focus:border-error-500 focus:ring-error-500' : ''}`}
                      placeholder="输入您想要达成的学习目标"
                      disabled={isSubmitting}
                      maxLength={200}
                    />
                  </div>
                  {formErrors.title && (
                    <p className="mt-1 text-sm text-error-600 dark:text-error-400">{formErrors.title}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formData.title.length}/200 字符
                  </p>
                </div>

                {/* 目标描述 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    目标描述（可选）
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className={`input ${formErrors.description ? 'border-error-300 focus:border-error-500 focus:ring-error-500' : ''}`}
                    placeholder="详细描述您的学习目标，包括要掌握的技能、知识点等"
                    disabled={isSubmitting}
                    maxLength={1000}
                  />
                  {formErrors.description && (
                    <p className="mt-1 text-sm text-error-600 dark:text-error-400">{formErrors.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {(formData.description || '').length}/1000 字符
                  </p>
                </div>

                {/* 目标日期 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    预期完成日期（可选）
                  </label>
                  <div className="flex items-center">
                    <CalendarDaysIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <input
                      type="date"
                      value={formData.targetDate}
                      onChange={(e) => handleInputChange('targetDate', e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className={`input ${formErrors.targetDate ? 'border-error-300 focus:border-error-500 focus:ring-error-500' : ''}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {formErrors.targetDate && (
                    <p className="mt-1 text-sm text-error-600 dark:text-error-400">{formErrors.targetDate}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    设定目标日期有助于制定学习计划和保持动力
                  </p>
                </div>

                {/* 按钮组 */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 btn-primary py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="spinner w-5 h-5 mr-2" />
                        {isEdit ? '更新中...' : '创建中...'}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                        {isEdit ? '更新目标' : '创建目标'}
                      </div>
                    )}
                  </button>

                  {!isEdit && (
                    <button
                      type="button"
                      onClick={handleCreateWithAI}
                      disabled={isSubmitting}
                      className="flex-1 btn-success py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-center">
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        创建并生成AI计划
                      </div>
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    disabled={isSubmitting}
                    className="btn-outline py-3 px-6"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* 右侧：模板和提示 */}
          <div className="space-y-6">
            {!isEdit && (
              /* 目标模板 */
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    目标模板
                  </h3>
                </div>
                <div className="card-body">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    点击下方模板快速填充目标信息
                  </p>
                  <div className="space-y-3">
                    {goalTemplates.map((template, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleTemplateClick(template)}
                        className="w-full text-left p-3 border border-gray-200 dark:border-gray-600 rounded-md hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        disabled={isSubmitting}
                      >
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {template.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {template.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 创建提示 */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  💡 创建提示
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                    <span>目标要具体明确，避免过于宽泛</span>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                    <span>设定合理的完成时间，保持动力</span>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                    <span>描述中可以包含学习方法和资源</span>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                    <span>创建后可以使用AI生成详细的学习计划</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
