import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { taskApi, videoResourceApi } from '../services/api';
import type { Task, VideoResource } from '../types';
import VideoEmbedPlayer from './VideoEmbedPlayer';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 状态管理
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoResource[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoSaving, setVideoSaving] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // 加载任务详情
  useEffect(() => {
    const loadTaskDetail = async () => {
      if (!id) {
        setError('任务ID不存在');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await taskApi.getTask(id);
        setTask(response.task);
        setError(null);
      } catch (err: any) {
        console.error('加载任务详情失败:', err);
        setError(err.message || '加载任务详情失败');
      } finally {
        setLoading(false);
      }
    };

    loadTaskDetail();
  }, [id]);

  const loadVideos = async (taskId: string) => {
    try {
      setVideosLoading(true);
      const { videos: list } = await videoResourceApi.listByTask(taskId);
      setVideos(list);
    } catch {
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      return;
    }
    void loadVideos(id);
  }, [id]);

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !videoUrl.trim()) {
      return;
    }
    try {
      setVideoSaving(true);
      setVideoError(null);
      await videoResourceApi.createEmbed({
        url: videoUrl.trim(),
        title: videoTitle.trim() || undefined,
        taskId: id,
      });
      setVideoUrl('');
      setVideoTitle('');
      await loadVideos(id);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || '添加失败';
      setVideoError(msg);
    } finally {
      setVideoSaving(false);
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    if (!id || !window.confirm('确定移除该视频链接？')) {
      return;
    }
    try {
      await videoResourceApi.remove(videoId);
      await loadVideos(id);
    } catch {
      alert('删除失败，请重试');
    }
  };

  // 切换任务完成状态
  const toggleTaskComplete = async () => {
    if (!task) return;

    try {
      const newCompleted = !task.completed;
      await taskApi.updateTask(task.id, { completed: newCompleted });
      setTask(prev => prev ? { ...prev, completed: newCompleted } : null);
    } catch (err: any) {
      console.error('更新任务状态失败:', err);
      alert('更新任务状态失败，请重试');
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">加载任务详情...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            加载失败
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => navigate('/goals')}
            className="btn-primary"
          >
            返回目标列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="btn-ghost mr-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {task.title}
              </h1>
              <div className="ml-4">
                {task.completed ? (
                  <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-sm px-3 py-1 rounded-full">
                    已完成
                  </div>
                ) : (
                  <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-sm px-3 py-1 rounded-full">
                    进行中
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
              <CalendarDaysIcon className="h-4 w-4 mr-1" />
              第 {task.week} 周 第 {task.day} 天
              <span className="mx-2">•</span>
              <ClockIcon className="h-4 w-4 mr-1" />
              创建于 {formatDate(task.createdAt)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 主要内容 */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {/* 任务描述 */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  任务描述
                </h3>
              </div>
              <div className="card-body">
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  暂无详细描述
                </p>
              </div>
            </div>

            {/* 关联学习视频（Wave 4：白名单外链） */}
            <div className="card">
              <div className="card-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">学习视频</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  支持 https 的哔哩哔哩 / YouTube / Vimeo 链接
                </span>
              </div>
              <div className="card-body space-y-6">
                {videoError && (
                  <div className="rounded-md border border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-900/20 px-3 py-2 text-sm text-error-800 dark:text-error-200">
                    {videoError}
                  </div>
                )}
                {videosLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">加载视频列表…</p>
                ) : videos.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">暂无关联视频，可在下方添加外链。</p>
                ) : (
                  <div className="space-y-8">
                    {videos.map((v) => (
                      <div key={v.id} className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {v.title || '未命名视频'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 break-all mt-0.5">{v.url}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleRemoveVideo(v.id)}
                            className="text-xs text-error-600 dark:text-error-400 hover:underline shrink-0"
                          >
                            移除
                          </button>
                        </div>
                        <VideoEmbedPlayer pageUrl={v.url} title={v.title} />
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={(e) => void handleAddVideo(e)} className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">粘贴视频页链接（需 https，域名在允许列表内）。</p>
                  <div>
                    <label htmlFor="embed-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      链接
                    </label>
                    <input
                      id="embed-url"
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="mt-1 input w-full"
                      placeholder="https://www.bilibili.com/video/BV…"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label htmlFor="embed-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      显示标题（可选）
                    </label>
                    <input
                      id="embed-title"
                      type="text"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      className="mt-1 input w-full"
                      placeholder="例如：第 3 讲预习"
                      maxLength={200}
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={videoSaving || !videoUrl.trim()}>
                    {videoSaving ? '保存中…' : '添加视频'}
                  </button>
                </form>
              </div>
            </div>

            {/* 关联计划信息 */}
            {task.plan && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    关联学习计划
                  </h3>
                </div>
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {task.plan.title}
                      </h4>
                      {task.plan.goal && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          目标：{task.plan.goal.title}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/plans/${task.plan?.id}`)}
                      className="btn-outline text-sm"
                    >
                      查看计划
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 侧边栏 */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            {/* 快速操作 */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  快速操作
                </h3>
              </div>
              <div className="card-body">
                <button
                  onClick={toggleTaskComplete}
                  className={`w-full flex items-center justify-center py-3 px-4 rounded-lg transition-colors ${
                    task.completed
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/30'
                  }`}
                >
                  {task.completed ? (
                    <CheckCircleIconSolid className="h-5 w-5 mr-2" />
                  ) : (
                    <PlayIcon className="h-5 w-5 mr-2" />
                  )}
                  {task.completed ? '标记为未完成' : '标记为已完成'}
                </button>
              </div>
            </div>

            {/* 任务信息 */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  任务信息
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">学习周次</span>
                    <span className="text-gray-900 dark:text-white">第 {task.week} 周</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">学习天数</span>
                    <span className="text-gray-900 dark:text-white">第 {task.day} 天</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">创建时间</span>
                    <span className="text-gray-900 dark:text-white">{formatDate(task.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">更新时间</span>
                    <span className="text-gray-900 dark:text-white">{formatDate(task.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">完成状态</span>
                    <span className={`${task.completed ? 'text-green-600' : 'text-yellow-600'}`}>
                      {task.completed ? '已完成' : '进行中'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 学习建议 */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  学习建议
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start">
                    <BookOpenIcon className="h-4 w-4 mt-0.5 mr-2 text-blue-500 flex-shrink-0" />
                    <span>制定具体的学习时间安排</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircleIcon className="h-4 w-4 mt-0.5 mr-2 text-green-500 flex-shrink-0" />
                    <span>完成后及时标记任务状态</span>
                  </div>
                  <div className="flex items-start">
                    <ClockIcon className="h-4 w-4 mt-0.5 mr-2 text-orange-500 flex-shrink-0" />
                    <span>记录学习时间和心得</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
