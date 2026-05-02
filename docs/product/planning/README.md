# LearnFlow 产品落地文档索引

本目录用于沉淀 LearnFlow 从产品想法到工程落地的执行文档，面向产品、设计、研发、测试共同协作。

## 文档清单

- `01-ai-product-execution-plan.md`
  - 从 0 到 1 的完整落地方案（不含支付集成）
  - 包含总体架构、AI 深度融合路径、模块拆分、里程碑
- `02-mvp-prd-v1.md`
  - MVP 产品需求文档 v1
  - 包含业务目标、用户故事、功能范围、验收标准、测试用例
- `03-phase-management-playbook.md`
  - 项目阶段性管理手册
  - 包含节奏机制、角色分工、风险机制、DoR/DoD、发布门禁
- `04-sprint-backlog-v1.md`
  - Sprint 分阶段执行清单
  - 包含每个 Sprint 的目标、任务拆分、owner、验收标准
- `05-api-contract-draft.md`
  - MVP API 合同草案
  - 包含核心接口定义、请求响应样例、联调检查清单
- `06-project-board-init-checklist.md`
  - 项目看板初始化与运行清单
  - 包含看板结构、标签体系、Epic 建议、发布门禁和复盘模板
- `07-contract-gap-list.md`
  - OpenAPI 与后端实现差异清单
  - 包含 P0/P1/P2 修复优先级
- `08-board-bootstrap-kit.md`
  - 看板初始化执行包
  - 包含 Epic、标签、DoR/DoD、发布门禁
- `09-sprint1-board-cards.csv`
  - Sprint 1 任务卡 CSV 模板
  - 可导入 Jira/Linear 使用
- `10-mvp-mainflow-test-baseline.md`
  - MVP 主链路测试基线（最小 5 条）
  - 用于 Sprint1 验收
- `11-ai-quality-gate.md`
  - AI 结构化输出质量门禁
  - 用于 Phase2 验收与回归
- `12-release-rollout-and-rollback-runbook.md`
  - 灰度发布与回滚演练手册
  - 用于 Phase3 发布与值守
- `13-frontend-integration-update.md`
  - 前端对接改造记录
  - 包含 API、类型、Dashboard、Review 页面改造说明
- `14-agent-architecture-next-phase.md`
  - 借鉴 Harness 的 Agent 工程化设计
  - 包含下一阶段详细任务、架构演进与技术栈变更建议
- `15-toc-saas-rice-backlog.md`（v1.3）
  - to C SaaS 化路线的一页 RICE 优先级表
  - 与 PRD 指标、Sprint backlog、执行计划边界对齐；含 **必达范围**（含 **Capacitor 必达**、双支付、MinIO、视频白名单与分档配额）、**卖点亮点**、里程碑与 DoR
- `16-agent-saas-dev-plan.md`（v1.1）
  - 基于 `15` 的 **Agent 自动开发波次计划**（逐项验证）
  - 含 **Wave 4–10**（MinIO、Stripe+微信+支付宝、`PaymentProvider`、**Capacitor 必达**）、§8.1 **已回填确认结论**、不可控风险（审核/商户资质）

## 建议使用顺序

1. 先阅读 `01-ai-product-execution-plan.md`，统一方向和技术路径。
2. 再评审 `02-mvp-prd-v1.md`，冻结 MVP 范围和验收口径。
3. 按 `03-phase-management-playbook.md` 建立项目管理节奏并执行。
4. 用 `04-sprint-backlog-v1.md` 直接创建 Sprint 和任务卡。
5. 用 `05-api-contract-draft.md` 完成前后端接口对齐与联调。
6. 用 `06-project-board-init-checklist.md` 初始化 Jira/Linear 看板并启动日常管理。
7. 用 `14-agent-architecture-next-phase.md` 启动 Agent Runtime 阶段改造。
8. to C 商业化排期时参考 `15-toc-saas-rice-backlog.md`，并回写 PRD 边界（支付/套餐）。
9. Agent/研发按波次落地时参考 `16-agent-saas-dev-plan.md`（移动选型、视频双形态、验证与待确认项）。

## 维护约定

- PRD 或架构变更后，需同步更新对应文档。
- 每个 Sprint 结束后，更新阶段管理文档中的里程碑与风险列表。
- 所有文档变更建议走 PR 评审，避免口头决策失真。

## 配套 API 合同

- `../../api/openapi.yaml`：OpenAPI 契约文件
- `../../api/README.md`：本地预览、Mock、SDK 生成说明