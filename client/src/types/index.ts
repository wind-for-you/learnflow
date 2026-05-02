// 用户类型
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  isActive?: boolean;
  avatar?: string;
  createdAt: string;
  /** ISO 时间；存在则不再展示首启引导 */
  onboardingFinishedAt?: string | null;
  _count?: {
    goals: number;
    plans: number;
    checkins: number;
  };
}

// 目标类型
export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
  progress: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  plans?: Plan[];
  _count?: {
    plans: number;
  };
}

// 计划类型
export interface Plan {
  id: string;
  goalId: string;
  title: string;
  durationWeeks: number;
  mermaidCode?: string;
  content?: string;
  isFallback?: boolean;
  fallbackReason?: string;
  progress?: number; // 0-100 百分比
  userId: string;
  createdAt: string;
  updatedAt: string;
  goal?: {
    id: string;
    title: string;
    status?: string;
  };
  tasks?: Task[];
  weeklyPlans?: WeeklyPlan[];
  stats?: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  };
  _count?: {
    tasks: number;
  };
}

// 周计划类型
export interface WeeklyPlan {
  week: number;
  title: string;
  description: string;
  goals: string[];
  tasks: Array<{
    day: number;
    title: string;
    description: string;
    estimatedTime: number;
  }>;
}

// 任务类型
export interface Task {
  id: string;
  planId: string;
  title: string;
  week: number;
  day: number;
  completed: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  description?: string; // AI生成的任务描述
  estimatedTime?: number; // AI生成的任务预计时间（分钟）
  plan?: {
    id: string;
    title: string;
    goal?: {
      id: string;
      title: string;
      description?: string;
    };
  };
}

// 打卡记录类型
export interface Checkin {
  id: string;
  date: string;
  duration: number; // 分钟
  notes?: string;
  rating?: number; // 1-5
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// 复盘记录类型
export interface Review {
  id: string;
  period: 'weekly' | 'monthly' | 'quarterly';
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIReviewSummary {
  summary: string;
  highlights: string[];
  suggestions: string[];
  isFallback: boolean;
}

export interface AnalyticsOverview {
  activeDays: number;
  completionRate: number;
  studyMinutes: number;
  streak: number;
}

export interface WeeklyReport {
  period: 'weekly';
  metrics: {
    totalMinutes: number;
    totalCheckins: number;
    averageRating: number;
    completionRate: number;
  };
  aiSummary: AIReviewSummary;
}

export interface AgentTask {
  id: string;
  userId: string;
  taskType: 'PLAN_GENERATION' | 'REVIEW_SUMMARY' | 'COACH_SUGGESTION' | 'ADAPTIVE_ADJUSTMENT';
  agentType: 'PLANNER' | 'REVIEWER' | 'COACH' | 'ADAPTER';
  providerType: 'DASHSCOPE' | 'OPENAI' | 'ANTHROPIC';
  state: 'UNINITIALIZED' | 'RUNNING' | 'COMPLETED' | 'ERROR' | 'CANCELLED';
  input: Record<string, unknown>;
  output?: Record<string, unknown> | null;
  errorMessage?: string | null;
  requestId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOverview {
  users: number;
  goals: number;
  plans: number;
  tasks: number;
  agentTasks: number;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  avatar?: string;
  createdAt: string;
  _count: {
    goals: number;
    plans: number;
    tasks: number;
    agentTasks: number;
  };
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  actor: {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'ADMIN';
  };
}

export interface OpsSystemOverview {
  releaseMetrics: {
    totalRequests: number;
    successResponses: number;
    errorResponses: number;
    successRate: number;
  };
  queueMetrics: Record<string, number>;
  failedTaskCount: number;
  redisUrl: string;
  workerConcurrency: number;
  serverTime: string;
}

/** Wave 3.5：后台 LLM Profile（密钥状态仅布尔，无明文） */
export interface LlmProfileAdminRow {
  id: string;
  slug: string;
  label: string;
  channel: 'DASHSCOPE' | 'OPENROUTER_COMPAT';
  baseUrl: string | null;
  model: string | null;
  timeoutMs: number;
  enabled: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  envKeyConfigured: boolean;
}

export interface LlmActivePreview {
  profileSlug: string;
  profileLabel: string;
  channel: 'DASHSCOPE' | 'OPENROUTER_COMPAT';
  baseURL: string;
  model: string;
  timeoutMs: number;
  hasApiKey: boolean;
}

export interface AgentRecentErrorRow {
  id: string;
  userId: string;
  taskType: string;
  agentType: string;
  state: string;
  errorMessage?: string | null;
  updatedAt: string;
  createdAt: string;
}

// API 响应类型
export interface ApiResponse<T = any> {
  message?: string;
  error?: string;
  data?: T;
}

// 分页类型
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// 列表响应类型
export interface ListResponse<T> {
  data: T[];
  pagination: Pagination;
}

// 认证相关类型
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  name: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

// 学习计划生成请求类型
export interface GeneratePlanRequest {
  goalId: string;
  goal: string;
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  hoursPerWeek: number;
  durationWeeks: number;
  preferredStyle?: 'practical' | 'theoretical' | 'mixed';
  specificRequirements?: string;
}

// 统计类型
export interface GoalStats {
  planCount: number;
  totalTasks: number;
  completedTasks: number;
  taskCompletionRate: number;
  totalStudyTime: number;
  averageRating: number;
  recentActivity: Array<{
    id: string;
    date: string;
    duration: number;
    rating?: number;
  }>;
}

export interface CheckinStats {
  period: 'week' | 'month' | 'year';
  periodStats: {
    totalDays: number;
    totalMinutes: number;
    totalHours: number;
    averageRating: number;
    averageHours: number;
  };
  overallStats: {
    totalCheckins: number;
    totalMinutes: number;
    totalHours: number;
    averageRating: number;
    averageDuration: number;
  };
  streaks: {
    current: number;
    max: number;
  };
  checkins: Array<{
    date: string;
    duration: number;
    rating?: number;
  }>;
}

// 表单类型
export interface GoalFormData {
  title: string;
  description?: string;
  targetDate?: string;
}

export interface TaskFormData {
  planId: string;
  title: string;
  week: number;
  day: number;
  completed?: boolean;
  description?: string;
  estimatedTime?: number;
}

export interface CheckinFormData {
  duration: number;
  notes?: string;
  rating?: number;
  date?: string;
  relatedTaskId?: string; // 关联的任务ID
  relatedPlanId?: string; // 关联的计划ID
}

// 主题类型
export type Theme = 'light' | 'dark' | 'system';

// 通知类型
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  createdAt: string;
}

// 组件 Props 类型
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'textarea';
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
}

// 图表数据类型
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

// 错误类型
export interface ApiError {
  error: string;
  message: string;
  details?: any[];
  status?: number;
}
