# Server Build 修复说明

## 改动总结

### 1. 构建脚本 (package.json)
- **build**: `tsc` → `npx tsc`，确保在任意环境下使用项目本地的 TypeScript 编译器。

### 2. Express 类型扩展 (src/types/express.d.ts) [新增]
- 通过 `declare global` 扩展 `Express.Request`，统一 `req.user` 类型为 `{ id, email, name, role }`。
- 与 @types/passport 的 `Express.User` 声明合并，消除路由中 `req.user` 与 `AuthenticatedRequest` 的类型冲突。
- 入口文件引入该模块以加载类型增强。

### 3. 入口加载类型 (src/index.ts)
- 在首行增加 `import './types/express'`，保证类型声明在应用启动时生效。

### 4. 认证中间件 (src/middleware/auth.ts)
- **AuthenticatedRequest**: 由 `interface extends Request` 改为 `type AuthenticatedRequest = Request`，与全局扩展一致。
- **requireAuth / optionalAuth / requireRole**: 参数类型由 `AuthenticatedRequest` 改为 `Request`，使中间件符合 Express `RequestHandler`，便于通过类型检查。
- **generateToken**: 修正 `jwt.sign` 的第三个参数类型，使用 `as jwt.SignOptions` 满足重载要求。

### 5. 目标统计逻辑 (src/routes/goals.ts)
- **Task 统计**: `Task.completed` 为 Boolean，Prisma `_sum` 仅支持数字字段。
- 原逻辑：一次 `aggregate` 使用 `_sum.completed` 与 `_count.id`，类型错误且不符合 Prisma 约定。
- 现逻辑：使用两次 `prisma.task.count()`（总任务数、已完成任务数），语义不变，类型正确。

## 影响范围

- 仅类型与构建方式调整，**业务逻辑与运行时行为不变**。
- `npm run build` 可正常通过并生成 `dist/`。
