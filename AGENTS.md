# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

LearnFlow is an AI-powered learning platform with a client/server architecture:

- **Frontend**: React 19 + TypeScript + Vite (port 5173)
- **Backend**: Node.js + Express + TypeScript + Prisma ORM (port 3000)
- **Database**: PostgreSQL (port 5432)

### Running the services

Standard commands documented in `README.md` and `package.json`. Key points:

- **Backend**: `cd server && npm run dev` (uses `tsx watch` for hot-reload)
- **Frontend**: `cd client && npm run dev` (Vite dev server)
- **Lint**: `cd client && npm run lint` (ESLint; server has no dedicated lint script — 类型检查用 `cd server && npm run build` 或 `node ./node_modules/typescript/bin/tsc --noEmit`，勿用易命中 npm 假包的 `npx tsc`)
- **Tests**: `cd server && npm test` (Jest, currently no test files exist)
- **Build**: `cd client && npm run build` (tsc + vite build)

### Non-obvious caveats

1. **PostgreSQL must be running** before starting the backend. Start it with: `sudo pg_ctlcluster 16 main start`
2. **Prisma client must be generated** after installing server dependencies: `cd server && npx prisma generate`
3. **Database schema sync**: Use `cd server && npx prisma db push` to push schema to a fresh database (no migration files exist in the repo).
4. **Environment files** (`.env`) are gitignored. For local dev, create:
  - `server/.env` with `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=development`, `PORT=3000`
  - `client/.env` with `VITE_API_URL=http://localhost:3000/api`
  - See `server/env.example` and `client/env.example` for templates.
5. **Pre-existing lint/type errors**: The codebase has known ESLint errors (mostly `no-explicit-any`, unused vars) and TypeScript strict-mode errors in the server. The `tsx watch` dev server and Vite dev server both bypass strict type checking, so these don't block development.
6. **AI features are optional**: The `OPENROUTER_API_KEY` env var is optional. Without it, the server warns but all CRUD features (goals, tasks, check-ins) work normally. A fallback plan generator exists.
7. **No lockfiles**: The repository has no `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml` — use `npm install` in both `client/` and `server/`.
8. **Database credentials for local dev**: The `docker-compose.yml` uses `learnflow_user` / `learnflow_password` / `learnflow` as defaults. Match these in `server/.env` `DATABASE_URL`.
9. **内置管理员与专用登录页**：启动时 `ensureBuiltInAdmin()` 会 upsert 默认账号（邮箱/密码见 `server/env.example`，可用 `BUILTIN_ADMIN_*` 覆盖）。密码 **bcrypt** 存库；**禁止**在 `POST /api/auth/register` 使用保留邮箱 `admin@learnflow.com`。
   - **学习用户**：`http://localhost:5173/login`（`loginPortal=app`），**管理员账号在此会被拒绝**，避免与学员混用。
   - **管理后台**：`http://localhost:5173/admin/login` → 成功后进入 `/admin`（用户、审计、LLM Profile）。
   - **运维后台**：`http://localhost:5173/ops/login` → 成功后进入 `/ops`（指标、队列、Agent 失败、D7）。
   - **手工种子**：`cd server && npm run db:seed`（等价于启动时的 ensure + LLM Profile）。
   - **额外管理员**：仍可由现有 ADMIN 在管理后台改角色，或 Prisma Studio / SQL 将某用户 `role` 设为 `ADMIN`。

### to C SaaS 规划与 Agent 波次（中文）

- [RICE 一页表 `15-toc-saas-rice-backlog.md](docs/product/planning/15-toc-saas-rice-backlog.md)`：必达范围、优先级、里程碑。
- [Agent 波次执行计划 `16-agent-saas-dev-plan.md](docs/product/planning/16-agent-saas-dev-plan.md)`：Wave0–Wave10、验证方式、不可行项与 §8.1 已确认结论。
- PR 模板：`[.github/pull_request_template.md](.github/pull_request_template.md)`。