# 看板初始化包（Phase0）

目标：按 `03-phase-management-playbook.md` 完成看板初始化，覆盖 Epic、标签、DoR/DoD、发布门禁。

## 1. 看板列（统一）

1. Backlog
2. Ready
3. In Progress
4. Code Review
5. Testing
6. Done
7. Blocked

## 2. 标签（建议一次性创建）

- `module:auth`
- `module:goal`
- `module:plan`
- `module:task`
- `module:checkin`
- `module:review`
- `module:ai`
- `module:analytics`
- `module:release`
- `type:feature`
- `type:bug`
- `type:techdebt`
- `priority:p0`
- `priority:p1`
- `priority:p2`

## 3. Epic（直接建 4 个）

| Epic ID | 标题 | 目标 |
| --- | --- | --- |
| E-01 | MVP 核心闭环 | 跑通 登录->目标->计划->任务->打卡->复盘 |
| E-02 | AI 编排与质量 | 统一 AI 入口、schema 校验、fallback |
| E-03 | 质量与可观测 | API/E2E/日志/告警/发布门禁 |
| E-04 | AI 学习助手增强 | AI 周复盘摘要、analytics 周报、对话能力 |

## 4. DoR（Ready 前必须满足）

- 业务价值明确
- 验收标准可测试
- 接口契约已确认（参考 `docs/api/openapi.yaml`）
- 依赖项已识别（上游接口、环境变量、数据准备）
- 风险已记录（至少 1 条规避策略）

## 5. DoD（Done 前必须满足）

- 代码评审通过
- 单测/集成/E2E（按模块要求）通过
- 埋点与日志可观测
- 文档同步（PRD/合同/操作说明）
- 无 P0 缺陷

## 6. 发布门禁（Release Gate）

- 核心链路 E2E 全通过
- 回滚路径演练通过
- 关键接口成功率 >= 99%
- AI fallback 可用率 100%
- 发布后 48h 观察值守安排完成

## 7. Sprint 1 初始卡片（直接创建）

详见：

- `docs/product/planning/09-sprint1-board-cards.csv`

导入方式：

- Jira：CSV Import
- Linear：CSV 导入或手动批量创建
