import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  ChartBarIcon,
  ClockIcon,
  FireIcon,
  TrophyIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { goalApi, checkinApi, taskApi, analyticsApi, authApi } from '../services/api';
import OnboardingWizard from './onboarding/OnboardingWizard';
import { clearOnboardingProgress } from '../utils/onboardingLocal';
import StudyTimeChart from './charts/StudyTimeChart';
import ProgressChart from './charts/ProgressChart';
import CheckinCalendar from './charts/CheckinCalendar';
import PomodoroTimer from './PomodoroTimer';
import type { Goal, Checkin, Task, CheckinStats, WeeklyReport, AnalyticsOverview } from '../types';
import { readWeeklyReportCache } from '../utils/weeklyReportCache';
import { track } from '../utils/productAnalytics';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const legacyOnboardingSyncRef = useRef(false);

  // 状态管理
  const [goals, setGoals] = useState<Goal[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [checkinStats, setCheckinStats] = useState<CheckinStats | null>(null);
  const [todayCheckin, setTodayCheckin] = useState<Checkin | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [weeklyReportLoading, setWeeklyReportLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dashboardMountedRef = useRef(true);

  useEffect(() => {
    dashboardMountedRef.current = true;
    return () => {
      dashboardMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    track('app_dashboard_view', {});
  }, []);

  // 计算今日任务
  const getTodayTasks = (tasks: Task[]): Task[] => {
    // 返回未完成的前3个任务作为今日任务
    return tasks.filter(task => !task.completed).slice(0, 3);
  };

  const getRecentTasks = (tasks: Task[]): Task[] => {
    // 返回最近创建的5个任务，按创建时间排序
    return tasks
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setWeeklyReport(null);

      const overviewSoft = analyticsApi.getOverview('30d').catch((overviewErr) => {
        console.warn('Analytics 概览加载失败，已使用打卡统计:', overviewErr);
        return null as AnalyticsOverview | null;
      });

      const [goalsResponse, checkinsResponse, tasksResponse, statsResponse, todayResponse, overviewMaybe] =
        await Promise.all([
          goalApi.getGoals({ limit: 10 }),
          checkinApi.getCheckins({ limit: 30 }),
          taskApi.getTasks({ limit: 10 }),
          checkinApi.getCheckinStats('month'),
          checkinApi.getTodayCheckin(),
          overviewSoft,
        ]);

      if (!dashboardMountedRef.current) return;

      setGoals(goalsResponse.goals);
      setCheckins(checkinsResponse.checkins);
      setRecentTasks(getRecentTasks(tasksResponse.tasks));
      setTodayTasks(getTodayTasks(tasksResponse.tasks));
      if (overviewMaybe) {
        setCheckinStats({
          ...statsResponse,
          streaks: {
            ...statsResponse.streaks,
            current: overviewMaybe.streak,
          },
          overallStats: {
            ...statsResponse.overallStats,
            totalHours: Math.round((overviewMaybe.studyMinutes / 60) * 10) / 10,
          },
        });
      } else {
        setCheckinStats(statsResponse);
      }
      setTodayCheckin(todayResponse.checkin || null);

      // 首屏不等待 AI 周报（最慢），先展示主体
      setIsLoading(false);

      const uid = user?.id;
      if (uid) {
        const cached = readWeeklyReportCache(uid);
        if (cached) {
          if (dashboardMountedRef.current) {
            setWeeklyReport(cached);
          }
        } else {
          setWeeklyReportLoading(true);
          try {
            const weeklyReportResponse = await analyticsApi.getWeeklyReport({ userId: uid });
            if (dashboardMountedRef.current) {
              setWeeklyReport(weeklyReportResponse);
            }
          } catch (weeklyErr) {
            console.warn('AI 周报加载失败:', weeklyErr);
            if (dashboardMountedRef.current) {
              setWeeklyReport(null);
            }
          } finally {
            setWeeklyReportLoading(false);
          }
        }
      } else {
        if (dashboardMountedRef.current) {
          setWeeklyReport(null);
        }
        setWeeklyReportLoading(false);
      }
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
      if (dashboardMountedRef.current) {
        setError('加载数据失败，请刷新页面重试');
      }
    } finally {
      if (dashboardMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user?.id]);

  // 须在 loadDashboardData 声明之后，否则会触发 TDZ（Cannot access before initialization）
  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    legacyOnboardingSyncRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || isLoading) return;
    if (user.onboardingFinishedAt) {
      clearOnboardingProgress(user.id);
      setOnboardingOpen(false);
      return;
    }
    if (goals.length > 0) {
      if (legacyOnboardingSyncRef.current) return;
      legacyOnboardingSyncRef.current = true;
      void authApi
        .finishOnboarding({ legacyHasGoals: true })
        .then((res) => {
          updateUser({ onboardingFinishedAt: res.user.onboardingFinishedAt ?? undefined });
          clearOnboardingProgress(user.id);
          setOnboardingOpen(false);
        })
        .catch(() => {
          legacyOnboardingSyncRef.current = false;
        });
      return;
    }
    setOnboardingOpen(true);
  }, [user, goals, isLoading]);

  const handleRefreshWeeklyReport = async () => {
    if (!user?.id) return;
    setWeeklyReportLoading(true);
    try {
      const data = await analyticsApi.refreshWeeklyReport(user.id);
      if (dashboardMountedRef.current) {
        setWeeklyReport(data);
      }
    } catch (e) {
      console.warn('刷新 AI 周报失败:', e);
    } finally {
      if (dashboardMountedRef.current) {
        setWeeklyReportLoading(false);
      }
    }
  };

  // 处理快速打卡
  const handleQuickCheckin = () => {
    navigate('/checkin');
  };

  // 处理日历日期点击
  const handleCalendarDateClick = (date: Date) => {
    navigate(`/checkin?date=${date.toISOString()}`);
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">正在加载您的学习数据...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-error-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-error-700 dark:text-error-300 mb-2">
            加载失败
          </h3>
          <p className="text-error-600 dark:text-error-400 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="btn-primary"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  const activeGoals = goals.filter(goal => goal.status === 'ACTIVE');
  const completedGoals = goals.filter(goal => goal.status === 'COMPLETED');
  const currentStreak = checkinStats?.streaks.current || 0;
  const totalStudyTime = checkinStats?.overallStats.totalHours || 0;

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            欢迎回来，{user?.name}！
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            继续您的学习之旅，每一天都是新的开始
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 活跃目标 */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BookOpenIcon className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    活跃目标
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activeGoals.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 完成目标 */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrophyIcon className="h-8 w-8 text-success-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    完成目标
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {completedGoals.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 连续打卡 */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FireIcon className="h-8 w-8 text-warning-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    连续打卡
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentStreak} 天
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 总学习时长 */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-info-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    总学习时长
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {totalStudyTime} 小时
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {weeklyReportLoading && !weeklyReport && (
          <div className="card mb-8 border border-gray-200 dark:border-gray-700">
            <div className="card-body flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="spinner w-5 h-5 shrink-0" />
              <span>正在生成 AI 周报摘要，可先浏览下方内容…</span>
            </div>
          </div>
        )}

        {weeklyReport && (
          <div className="card mb-8 border border-primary-200 dark:border-primary-900/40">
            <div className="card-header flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <SparklesIcon className="h-5 w-5 text-primary-600 mr-2" />
                AI 周报摘要
              </h3>
              {user?.id && (
                <button
                  type="button"
                  onClick={() => void handleRefreshWeeklyReport()}
                  disabled={weeklyReportLoading}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  title="清除当日缓存并重新请求 AI（会产生模型调用费用）"
                >
                  <ArrowPathIcon className={`h-3.5 w-3.5 ${weeklyReportLoading ? 'animate-spin' : ''}`} />
                  重新生成
                </button>
              )}
            </div>
            <div className="card-body space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">{weeklyReport.aiSummary.summary}</p>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">本周亮点</p>
                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  {weeklyReport.aiSummary.highlights.slice(0, 2).map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">下周建议</p>
                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  {weeklyReport.aiSummary.suggestions.slice(0, 2).map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 快速操作 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={handleQuickCheckin}
            className={`card hover:shadow-md transition-shadow duration-200 ${
              todayCheckin ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800' : ''
            }`}
          >
            <div className="card-body text-center">
              <CalendarDaysIcon className={`h-8 w-8 mx-auto mb-2 ${
                todayCheckin ? 'text-success-600' : 'text-primary-600'
              }`} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {todayCheckin ? '更新今日打卡' : '今日打卡'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {todayCheckin 
                  ? `已学习 ${Math.round(todayCheckin.duration / 60 * 10) / 10} 小时`
                  : '记录您的学习时光'
                }
              </p>
            </div>
          </button>

          <Link to="/goals/new" className="card hover:shadow-md transition-shadow duration-200">
            <div className="card-body text-center">
              <PlusIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                创建目标
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                设定新的学习目标
              </p>
            </div>
          </Link>

          <Link to="/planner" className="card hover:shadow-md transition-shadow duration-200">
            <div className="card-body text-center">
              <SparklesIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                AI 规划
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                智能生成学习计划
              </p>
            </div>
          </Link>

          {/* 今日学习任务 */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <BookOpenIcon className="h-5 w-5 text-blue-600 mr-2" />
                  今日学习
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {todayTasks.length} 个任务
                </span>
              </div>
              
              {todayTasks.length > 0 ? (
                <div className="space-y-2">
                  {todayTasks.slice(0, 2).map((task, index) => (
                    <div key={task.id} className="flex items-start p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mr-2 mt-0.5">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-900 dark:text-white font-medium line-clamp-1">
                          {task.title}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs flex items-center mt-1">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          第{task.week}周 第{task.day}天
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {todayTasks.length > 2 && (
                    <div className="text-center pt-2">
                      <Link
                        to="/tasks"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        查看全部任务 →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <BookOpenIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    暂无今日任务
                  </p>
                  <Link
                    to="/planner"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-1 inline-block"
                  >
                    创建学习计划 →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 学习时长趋势 */}
          <StudyTimeChart 
            checkins={checkins}
            period="month"
            isDark={false}
          />

          {/* 目标进度 */}
          <ProgressChart 
            goals={goals}
            type="doughnut"
            isDark={false}
          />
        </div>

        {/* 底部区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 打卡日历 */}
          <div className="lg:col-span-2">
            <CheckinCalendar 
              checkins={checkins}
              onDateClick={handleCalendarDateClick}
            />
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 最近目标 */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    最近目标
                  </h3>
                  <Link to="/goals" className="text-sm text-primary-600 hover:text-primary-500">
                    查看全部
                  </Link>
                </div>
              </div>
              <div className="card-body">
                {activeGoals.length === 0 ? (
                  <div className="text-center py-4">
                    <BookOpenIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      暂无活跃目标
                    </p>
                    <Link to="/goals/new" className="text-sm text-primary-600 hover:text-primary-500">
                      创建第一个目标
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeGoals.slice(0, 3).map(goal => (
                      <div key={goal.id} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {goal.title}
                          </p>
                          <div className="mt-1 flex items-center">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${goal.progress}%` }}
                              />
                            </div>
                            <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                              {goal.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 最近任务 */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    最近任务
                  </h3>
                  <Link to="/tasks" className="text-sm text-primary-600 hover:text-primary-500">
                    查看全部
                  </Link>
                </div>
              </div>
              <div className="card-body">
                {recentTasks.length === 0 ? (
                  <div className="text-center py-4">
                    <ChartBarIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      暂无任务
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTasks.slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center justify-between group">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 mr-3 transition-colors ${
                            task.completed 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {task.completed && (
                              <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm block truncate ${
                              task.completed 
                                ? 'text-gray-500 dark:text-gray-400 line-through' 
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {task.title}
                            </span>
                            {task.plan && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 block truncate">
                                {task.plan.title}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link
                          to={task.plan ? `/plans/${task.plan.id}` : `/tasks`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-primary-600 hover:text-primary-500"
                        >
                          查看 →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 番茄钟 */}
        <div className="mt-8">
          <PomodoroTimer />
        </div>
      </div>
      {user?.id ? (
        <OnboardingWizard
          open={onboardingOpen}
          userId={user.id}
          onFinished={(u) => {
            updateUser({ onboardingFinishedAt: u.onboardingFinishedAt ?? undefined });
            setOnboardingOpen(false);
            void loadDashboardData();
          }}
        />
      ) : null}
    </>
  );
}
