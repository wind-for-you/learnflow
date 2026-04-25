# 灰度发布与回滚演练手册（Phase3）

## 1. 灰度策略

当前系统通过环境变量控制灰度：

- `GRAY_RELEASE_ENABLED=true|false`
- `GRAY_RELEASE_PERCENT=0-100`
- `GRAY_RELEASE_USERS=userId1,userId2`

生效范围（当前版本）：

- `POST /api/reviews/ai-summary`
- `GET /api/analytics/overview`
- `GET /api/analytics/weekly-report`

## 2. 发布前检查

1. 执行门禁脚本：

```bash
cd server
npm run release:gate
```

2. 执行自动化测试：

```bash
cd server
npm test
```

3. 确认观测接口可用：

- `GET /api/ops/release-metrics`

## 3. 灰度推进步骤

1. 白名单灰度（仅内部账号）
2. `GRAY_RELEASE_PERCENT=10`
3. 观察 24h：成功率、错误率、AI fallback
4. `GRAY_RELEASE_PERCENT=30`
5. 观察 24h
6. `GRAY_RELEASE_PERCENT=100`

## 4. 观察指标

- 总请求量：`totalRequests`
- 成功响应数：`successResponses`
- 失败响应数：`errorResponses`
- 成功率：`successRate`

判定建议：

- 成功率 < 99%：停止放量并排查
- 连续 30 分钟错误上升：触发回滚

## 5. 回滚演练流程

## 演练目标

验证“灰度功能可快速关闭，不影响主链路”。

## 演练步骤

1. 设置 `GRAY_RELEASE_ENABLED=true`，`GRAY_RELEASE_PERCENT=30`
2. 触发灰度接口压测/访问
3. 人工注入异常（例如配置错误）
4. 执行回滚：`GRAY_RELEASE_ENABLED=false`
5. 验证：
   - 灰度接口不可访问（返回 Feature Disabled 或走关闭分支）
   - MVP 主链路（目标、计划、任务、打卡、复盘）不受影响
   - `/api/ops/release-metrics` 仍可观测

## 6. 回滚完成标准

- 回滚在 10 分钟内完成
- 无新增 P0 故障
- 回滚后主链路成功率恢复到基线
- 演练记录已归档（时间、责任人、问题与改进）
