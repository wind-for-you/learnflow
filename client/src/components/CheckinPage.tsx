import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ClockIcon,
  CalendarDaysIcon,
  StarIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { checkinApi } from '../services/api';
import type { Checkin, CheckinFormData } from '../types';
import { track } from '../utils/productAnalytics';

export default function CheckinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingCheckin, setExistingCheckin] = useState<Checkin | null>(null);

  const [formData, setFormData] = useState<CheckinFormData>({
    duration: 15,
    notes: '',
    rating: 0,
    date: searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    void loadTodayCheckin();
  }, []);

  const loadTodayCheckin = async () => {
    try {
      const response = await checkinApi.getTodayCheckin();
      if (response.checkin) {
        setExistingCheckin(response.checkin);
        setFormData({
          duration: response.checkin.duration,
          notes: response.checkin.notes || '',
          rating: response.checkin.rating || 0,
          date: format(new Date(response.checkin.date), 'yyyy-MM-dd'),
        });
      }
    } catch (err) {
      console.error('加载今日打卡失败:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.duration < 1) {
      setError('学习时长必须大于 0 分钟');
      return;
    }

    if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
      setError('请选择 1-5 星的评分');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (existingCheckin) {
        await checkinApi.updateCheckin(existingCheckin.id, {
          duration: formData.duration,
          notes: formData.notes,
          rating: formData.rating,
        });
        setSuccess('打卡记录更新成功！');
      } else {
        await checkinApi.createCheckin(formData);
        track('checkin_created', { duration: formData.duration });
        setSuccess('打卡成功！继续保持学习的好习惯 🎉');
      }

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '打卡失败，请重试';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CheckinFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const quickDurations = [15, 30, 45, 60, 90, 120];

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} 分钟`;
    if (mins === 0) return `${hours} 小时`;
    return `${hours} 小时 ${mins} 分钟`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          返回今日
        </button>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {existingCheckin ? '更新今日打卡' : '今日学习打卡'}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">记录学习时长，形成可持续的学习节奏</p>
      </div>

      {success && (
        <div className="mb-6 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-md p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-success-400 mt-0.5" />
            <p className="ml-3 text-sm text-success-700 dark:text-success-300">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-md p-4">
          <p className="text-sm text-error-700 dark:text-error-300">{error}</p>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">学习记录</h2>
        </div>

        <form onSubmit={handleSubmit} className="card-body space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">学习日期</label>
            <div className="flex items-center">
              <CalendarDaysIcon className="h-5 w-5 text-gray-400 mr-2" />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="input"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">学习时长</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {quickDurations.map((duration) => (
                <button
                  key={duration}
                  type="button"
                  onClick={() => handleInputChange('duration', duration)}
                  className={`btn-outline text-sm py-2 ${
                    formData.duration === duration
                      ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700'
                      : ''
                  }`}
                  disabled={isSubmitting}
                >
                  {formatDuration(duration)}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              <input
                type="number"
                min={1}
                max={1440}
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value, 10) || 0)}
                className="input flex-1"
                placeholder="输入分钟数"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">{formatDuration(formData.duration)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">学习效果评分</label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleInputChange('rating', star)}
                  className="p-1 hover:scale-110 transition-transform duration-200"
                  disabled={isSubmitting}
                >
                  {star <= (formData.rating || 0) ? (
                    <StarIconSolid className="h-8 w-8 text-warning-400" />
                  ) : (
                    <StarIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                  )}
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {(formData.rating || 0) > 0 ? `${formData.rating} 星` : '请选择评分'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">学习笔记（可选）</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className="input"
              placeholder="记录今天的收获、问题或感想..."
              disabled={isSubmitting}
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isSubmitting || formData.rating === 0}
              className="flex-1 btn-primary py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '提交中…' : existingCheckin ? '更新打卡' : '完成打卡'}
            </button>
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
  );
}
