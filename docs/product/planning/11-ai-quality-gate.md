# AI 结构化输出质量门禁（Phase2）

## 目标

确保 AI 相关接口输出可解析、可回退、可观测，满足阶段门禁：

- 结构化可解析率 >= 98%
- 异常有 fallback
- 不破坏 MVP 主链路

## 覆盖范围

- `POST /api/reviews/ai-summary`
- `GET /api/analytics/weekly-report` 中的 `aiSummary`
- `POST /api/plans/generate`（已有 fallback 机制）

## 当前实现

1. 新增结构化摘要接口：`server/src/routes/reviews.ts`
2. 新增 schema guard：`server/src/services/aiSchemaGuard.ts`
3. analytics 周报接入 schema guard：`server/src/routes/analytics.ts`
4. 自动化测试：
   - `server/src/services/aiSchemaGuard.test.ts`
   - `server/src/services/progressService.test.ts`

## 质量检查项

- [ ] AI 返回空字段时可自动填充默认值
- [ ] highlights/suggestions 非字符串项会被过滤
- [ ] fallback 状态可追踪（`isFallback`）
- [ ] 接口错误时返回明确状态码和 message

## 运行命令

```bash
cd server
npm test
```

## 下一步建议

- 增加 AI 成功率/耗时/回退率日志聚合
- 补充 `plans/generate` 的结构化 schema 测试样例
- 将 AI 质量指标接入发布门禁脚本
