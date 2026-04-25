# OpenAPI 合同差异清单（Phase0）

基线对比：

- 合同：`docs/api/openapi.yaml`
- 实现：`server/src/routes/*.ts`、`server/src/index.ts`

## 1. 差异总览

| 模块 | 合同定义 | 当前实现 | 结论 |
| --- | --- | --- | --- |
| Auth | `/auth/register` 返回 `success/data` | 返回 `message/user/token` | 响应结构不一致 |
| Goals | `GET /goals` 返回数组 `data` | 返回 `goals + pagination` | 响应结构不一致 |
| Plans | `POST /plans/generate` 不要求 `goalId` | 当前要求 `goalId` | 请求字段不一致 |
| Plans | `PATCH /plans/:id` | 当前为 `PUT /plans/:id` | 方法不一致 |
| Tasks | `PATCH /tasks/:id` | 当前为 `PUT /tasks/:id/complete` + `PUT /tasks/:id` | 路由不一致 |
| Checkins | `GET /checkins?from&to` | 当前 `startDate/endDate` | 查询参数不一致 |
| Reviews | `POST /reviews/ai-summary` | 当前未实现 | 缺失接口 |
| Analytics | `/analytics/overview`、`/analytics/weekly-report` | 当前未挂载 analytics 路由 | 缺失模块 |
| AITasks | 合同基本覆盖 | 当前已实现 GET/PUT/batch | 基本一致 |

## 2. 关键差异明细

## 2.1 请求方法/路径差异

1. `PATCH /api/plans/:id`（合同）  
   当前仅有 `PUT /api/plans/:id`。

2. `PATCH /api/tasks/:id`（合同）  
   当前是：
   - `PUT /api/tasks/:id/complete`（更新完成态）
   - `PUT /api/tasks/:id`（更新标题/周/天）

3. `POST /api/reviews/ai-summary`（合同）  
   当前未实现。

4. `GET /api/analytics/overview`、`GET /api/analytics/weekly-report`（合同）  
   当前未实现且未挂载 analytics 路由。

## 2.2 请求参数差异

1. `POST /api/plans/generate`  
   - 合同：`goal/currentLevel/hoursPerWeek/durationWeeks...`
   - 当前：额外必填 `goalId`

2. `GET /api/checkins`  
   - 合同：`from`、`to`
   - 当前：`startDate`、`endDate`

## 2.3 响应体差异（统一规范问题）

合同推荐统一返回：

```json
{ "success": true, "data": {...}, "message": "optional" }
```

当前实现普遍为：

```json
{ "message": "...", "goal|plan|task|user": {...} }
```

或：

```json
{ "goals": [...], "pagination": {...} }
```

这会导致：

- 前端 SDK 难以统一解析
- E2E/契约测试编写成本高
- 错误处理风格不一致

## 3. 优先级与修复顺序

## P0（本周必须）

1. 增加 `POST /api/reviews/ai-summary`
2. 增加 `GET /api/analytics/overview`、`GET /api/analytics/weekly-report`
3. 补 `PATCH /api/tasks/:id` 兼容路由（完成态更新）
4. 补 `PATCH /api/plans/:id` 兼容路由

## P1（下个迭代）

5. `GET /api/checkins` 支持 `from/to` 与 `startDate/endDate` 双参数兼容
6. `POST /api/plans/generate` 支持 `goalId` 可选策略（若无则自动选择 ACTIVE 目标）

## P2（统一改造）

7. 全部路由响应体统一为 `success/data/message/error`
8. 接入 Contract Test，防止后续再次偏移

## 4. 验收口径（Phase0 Contract Gap 完成）

- 有文档化差异清单（本文件）
- 每条差异都有处理优先级（P0/P1/P2）
- P0 差异在后续开发任务中已分配 owner 并进入 Sprint 看板
