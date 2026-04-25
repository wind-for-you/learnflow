# LearnFlow 项目看板初始化清单（Jira/Linear 通用）

## 1. 看板结构初始化

建议列（从左到右）：

1. Backlog
2. Ready
3. In Progress
4. Code Review
5. Testing
6. Done
7. Blocked

## 2. 标签体系（必须先建）

- `module:auth`
- `module:goal`
- `module:plan`
- `module:task`
- `module:checkin`
- `module:review`
- `module:ai`
- `module:analytics`
- `type:feature`
- `type:bug`
- `type:techdebt`
- `priority:p0`
- `priority:p1`
- `priority:p2`

## 3. Epic 初始化（建议）

| Epic 编号 | Epic 名称 | 目标 |
| --- | --- | --- |
| E-01 | MVP 核心学习闭环 | 跑通目标到复盘 |
| E-02 | AI 编排与回退机制 | 保证 AI 可用与可控 |
| E-03 | 质量与可观测体系 | 确保可测试、可灰度 |
| E-04 | AI 学习助手 | 实现对话与个性化建议 |

## 4. Story 模板（统一字段）

- 标题：
- 业务价值：
- 需求描述：
- 验收标准（Given/When/Then）：
- 技术方案摘要：
- 风险与依赖：
- 测试点：
- Owner：
- 预计工时：

## 5. Task 拆分规则（强制）

- 每个 Story 至少拆成 3 个 Task：
  - 开发 Task
  - 测试 Task
  - 文档/埋点 Task
- 单个 Task 不超过 2 人日
- 超过 2 人日必须继续拆分

## 6. Sprint 初始化清单

每次 Sprint 开始前确认：

- [ ] 所有 Story 达到 DoR
- [ ] Owner 明确，无无人负责卡片
- [ ] P0 风险有预案
- [ ] 测试资源已确认
- [ ] 发布窗口已确认

## 7. 每日运转规则

- Daily 站会 15 分钟
- Blocked 卡片必须当日推动解决方案
- 新需求默认进 Backlog，不允许直接插入 In Progress
- 变更范围需 PM + Tech Lead 同意

## 8. 发布前门禁卡

- [ ] 核心 E2E 全通过
- [ ] P0 缺陷清零
- [ ] 回滚脚本验证通过
- [ ] 关键埋点可观测
- [ ] 发布公告与风险说明完成

## 9. 复盘模板（Sprint 结束）

## 9.1 结果回顾

- 计划完成率：
- 延期任务：
- 线上问题：

## 9.2 原因分析

- 做得好的：
- 做得不好的：
- 最大阻塞点：

## 9.3 行动项（最多 3 条）

1.
2.
3.

## 10. 首批建议建卡（可直接抄）

1. `[E-01] 新用户从注册到生成首个学习计划主链路`
2. `[E-02] AI 计划生成 schema 校验与 fallback 机制`
3. `[E-01] 任务完成触发计划进度重算`
4. `[E-01] 周复盘页面与 AI 建议展示`
5. `[E-03] 核心 API 埋点与告警`
6. `[E-03] 主路径 E2E 自动化`
7. `[E-04] AI 对话助手 v1`
