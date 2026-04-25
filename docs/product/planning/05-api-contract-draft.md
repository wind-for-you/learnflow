# LearnFlow API 合同草案 v1（MVP）

版本：v1.0  
用途：前后端联调契约 + 测试基线  
说明：在现有接口基础上补齐 AI 编排与分析能力

## 1. 通用约定

- Base URL：`/api`
- 鉴权：`Authorization: Bearer <token>`
- 响应格式：

```json
{
  "success": true,
  "data": {},
  "message": "optional",
  "error": "optional"
}
```

- 错误码建议：
  - `400` 参数错误
  - `401` 未认证/令牌过期
  - `403` 越权访问
  - `404` 资源不存在
  - `429` 限流
  - `500` 服务异常

## 2. Auth

## `POST /auth/register`

请求：

```json
{
  "email": "user@example.com",
  "name": "Alice",
  "password": "******"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "token": "jwt",
    "user": { "id": "u1", "email": "user@example.com", "name": "Alice" }
  }
}
```

## `POST /auth/login`

请求：

```json
{ "email": "user@example.com", "password": "******" }
```

## 3. Goals

## `GET /goals`

响应字段：

```json
{
  "success": true,
  "data": [
    {
      "id": "g1",
      "title": "学习 TypeScript",
      "status": "ACTIVE",
      "progress": 30,
      "targetDate": "2026-06-30T00:00:00.000Z"
    }
  ]
}
```

## `POST /goals`

请求：

```json
{
  "title": "学习 TypeScript",
  "description": "2个月掌握工程化",
  "targetDate": "2026-06-30"
}
```

## 4. Plans（AI 计划核心）

## `POST /plans/generate`

请求：

```json
{
  "goal": "学习 TypeScript",
  "currentLevel": "beginner",
  "hoursPerWeek": 6,
  "durationWeeks": 8,
  "preferredStyle": "mixed",
  "specificRequirements": "偏项目实战"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "title": "TypeScript 8周学习计划",
    "description": "从基础到项目实践",
    "durationWeeks": 8,
    "weeklyPlans": [
      {
        "week": 1,
        "title": "基础语法",
        "description": "掌握类型系统",
        "goals": ["理解基本类型"],
        "tasks": [
          { "day": 1, "title": "基础类型", "description": "学习 number/string", "estimatedTime": 60 }
        ]
      }
    ],
    "mermaidCode": "graph TD\nA[开始]-->B[第一周]",
    "meta": {
      "provider": "openrouter",
      "model": "openai/gpt-3.5-turbo",
      "isFallback": false
    }
  }
}
```

## `GET /plans/:id`

返回计划详情与进度。

## `PATCH /plans/:id`

支持修改计划标题、描述、状态等。

## 5. Tasks

## `GET /tasks?planId=:id`

返回某计划下任务列表。

## `PATCH /tasks/:id`

请求：

```json
{ "completed": true }
```

响应需返回最新计划进度摘要：

```json
{
  "success": true,
  "data": {
    "taskId": "t1",
    "completed": true,
    "planProgress": 42
  }
}
```

## 6. AI Task Completions

## `GET /ai-tasks/:planId`

返回 AI 任务完成 map：

```json
{
  "success": true,
  "data": {
    "completions": { "week-1-day-1-0": true }
  }
}
```

## `PUT /ai-tasks/:planId/:taskKey`

请求：

```json
{ "completed": true }
```

## `PUT /ai-tasks/:planId/batch`

请求：

```json
{
  "completions": {
    "week-1-day-1-0": true,
    "week-1-day-2-0": false
  }
}
```

## 7. Checkins

## `POST /checkins`

请求：

```json
{
  "date": "2026-04-25",
  "duration": 90,
  "notes": "完成 TS 泛型练习",
  "rating": 4
}
```

## `GET /checkins?from=2026-04-01&to=2026-04-30`

返回区间打卡记录。

## 8. Reviews

## `POST /reviews`

请求：

```json
{
  "period": "weekly",
  "content": {
    "summary": "本周完成度较高",
    "challenge": "时间分配不均"
  }
}
```

## `POST /reviews/ai-summary`

请求：

```json
{
  "period": "weekly",
  "source": {
    "tasks": [],
    "checkins": [],
    "notes": []
  }
}
```

响应：

```json
{
  "success": true,
  "data": {
    "summary": "本周学习节奏稳定",
    "highlights": ["完成 6/7 天任务"],
    "suggestions": ["周三安排轻量任务以避免疲劳"]
  }
}
```

## 9. Analytics（新增建议）

## `GET /analytics/overview?range=7d`

返回核心指标：

```json
{
  "success": true,
  "data": {
    "activeDays": 5,
    "completionRate": 0.72,
    "studyMinutes": 420,
    "streak": 4
  }
}
```

## `GET /analytics/weekly-report`

返回周报数据（图表 + AI 建议）。

## 10. 字段约束建议

- `durationWeeks`：`1-52`
- `hoursPerWeek`：`1-40`
- `rating`：`1-5`
- `progress`：`0-100`

## 11. 联调检查清单

- 前后端字段命名一致（camelCase）
- 时间字段统一 ISO 字符串
- AI 字段必须包含 `meta.isFallback`
- 所有写接口需返回可用于前端更新的最小摘要数据

## 12. OpenAPI 迁移建议（下一步）

可将本文件转换为 `openapi.yaml`，并接入：

- Mock Server（前端先行开发）
- Contract Test（防止接口变更破坏联调）
- SDK 自动生成（减少手写接口错误）
