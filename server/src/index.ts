import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
// 导入路由
import authRoutes from './routes/auth';
import goalRoutes from './routes/goals';
import planRoutes from './routes/plans';
import taskRoutes from './routes/tasks';
import checkinRoutes from './routes/checkins';
import aiTaskRoutes from './routes/aiTasks';
import reviewRoutes from './routes/reviews';
import achievementRoutes from './routes/achievements';
import adaptiveRoutes from './routes/adaptive';
import analyticsRoutes from './routes/analytics';
import opsRoutes from './routes/ops';
import accountRoutes from './routes/account';
import agentTaskRoutes from './routes/agentTasks';
import agentMemoryRoutes from './routes/agentMemories';
import adminRoutes from './routes/admin';
import videoResourceRoutes from './routes/videoResources';
import { metricsMiddleware } from './middleware/metrics';
import prisma from './shared/prisma';
import logger from './shared/logger';
import { validateEnv } from './shared/env';
import { ensureLlmProviderProfiles } from './services/llmProfileSeed';
import { ensureBuiltInAdmin, BUILTIN_ADMIN_EMAIL } from './services/builtInAdminSeed';

// 导入 Passport 配置
import passport from './config/passport';

// 加载环境变量并校验
dotenv.config();
const env = validateEnv();

// 创建 Express 应用
const app = express();
const PORT = env.PORT;

// 全局中间件（Wave 4：允许白名单视频站 iframe 嵌入）
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'frame-src': [
          "'self'",
          'https://www.youtube.com',
          'https://youtube.com',
          'https://www.youtube-nocookie.com',
          'https://player.vimeo.com',
          'https://vimeo.com',
          'https://player.bilibili.com',
          'https://www.bilibili.com',
          'https://m.bilibili.com',
        ],
      },
    },
  }),
);

function resolveCorsOrigin(): string | string[] {
  const clientUrl = process.env.CLIENT_URL;
  const devDefaults = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  if (process.env.NODE_ENV === 'production') {
    return clientUrl || devDefaults[0];
  }
  return [...new Set([...(clientUrl ? [clientUrl] : []), ...devDefaults])];
}

app.use(cors({
  origin: resolveCorsOrigin(),
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(metricsMiddleware);

// 速率限制 - 开发环境放宽限制
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 生产环境100次/分钟，开发环境1000次/分钟
  message: {
    error: 'Too Many Requests',
    message: '请求频率过高，请稍后重试',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 在开发环境跳过某些路径的限制
    if (process.env.NODE_ENV !== 'production') {
      const skipPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/me',
        '/api/auth/onboarding/finish',
        '/api/account/export',
      ];
      return skipPaths.some(path => req.path === path);
    }
    return false;
  },
});

// 只在生产环境应用严格的速率限制
if (process.env.NODE_ENV === 'production') {
  app.use('/api', limiter);
} else {
  // 开发环境使用更宽松的限制，仅针对密集操作
  const devLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 500, // 开发环境每分钟500次请求
    message: {
      error: 'Too Many Requests',
      message: '请求频率过高，请稍后重试',
    },
  });
  app.use('/api', devLimiter);
}

// Passport 中间件
app.use(passport.initialize());

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/ai-tasks', aiTaskRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/adaptive', adaptiveRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ops', opsRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agent-tasks', agentTaskRoutes);
app.use('/api/agent-memories', agentMemoryRoutes);
app.use('/api/video-resources', videoResourceRoutes);

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: '请求的资源不存在',
    path: req.originalUrl,
  });
});

// 全局错误处理中间件
app.use((error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // AppError — 业务逻辑主动抛出的已知错误
  if (error.name === 'AppError') {
    return res.status(error.statusCode).json({
      error: error.code || 'AppError',
      message: error.message,
      ...(error.details && { details: error.details }),
    });
  }

  // Prisma 错误处理
  if (error.code === 'P2002') {
    return res.status(409).json({
      error: 'Conflict',
      message: '数据已存在，违反唯一性约束',
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      error: 'Not Found',
      message: '请求的资源不存在',
    });
  }

  // JWT 错误
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: '无效的认证令牌',
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: '认证令牌已过期',
    });
  }

  // 未知错误
  logger.error('未处理的错误', error);
  res.status(500).json({
    error: 'Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
});

// 优雅关闭处理
async function gracefulShutdown(signal: string) {
  logger.info(`收到 ${signal} 信号，开始优雅关闭...`);
  
  try {
    await prisma.$disconnect();
    logger.info('Prisma 连接已断开');
    process.exit(0);
  } catch (error) {
    logger.error('优雅关闭失败', error as Error);
    process.exit(1);
  }
}

// 监听退出信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('未处理的 Promise 拒绝', { reason });
  gracefulShutdown('unhandledRejection');
});

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    await prisma.$connect();
    logger.info('数据库连接成功');

    await ensureBuiltInAdmin();
    await ensureLlmProviderProfiles();

    app.listen(PORT, () => {
      logger.info(`LearnFlow 服务器运行在端口 ${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`客户端地址: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      logger.info(`JWT: ${process.env.JWT_SECRET ? '已配置' : '未配置'}`);
      const aiOk =
        Boolean(process.env.DASHSCOPE_API_KEY?.trim()) ||
        Boolean(process.env.OPENROUTER_API_KEY?.trim());
      logger.info(`AI 服务: ${aiOk ? '已配置(DASHSCOPE 或 OPENROUTER 密钥)' : '未配置'}`);
      logger.info(`Redis: ${process.env.REDIS_URL || 'redis://127.0.0.1:6379'}`);
      logger.info(`内置管理员: ${BUILTIN_ADMIN_EMAIL}（请使用 /admin/login 或 /ops/login；生产务必改密）`);
    });
  } catch (error) {
    logger.error('服务器启动失败', error as Error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
