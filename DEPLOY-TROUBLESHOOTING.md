# 部署问题排查：learnflow-backend unhealthy

## 1. 先看后端日志（必做）

在项目根目录执行：

```bash
docker compose logs backend
```

或只看最近 100 行：

```bash
docker compose logs --tail=100 backend
```

根据日志里的报错信息往下对照。

---

## 2. 常见原因与处理

### ① 未设置 JWT_SECRET（最常见）

**现象**：日志里出现 `缺少必需的环境变量: JWT_SECRET`，进程直接退出。

**原因**：`docker-compose.yml` 里写的是 `JWT_SECRET: ${JWT_SECRET}`，没有默认值。若部署时没设置该环境变量，后端会在启动时 `validateEnv()` 里 `process.exit(1)`，容器反复重启，健康检查一直失败。

**处理**：在**宿主机**设置 `JWT_SECRET` 后再启动，例如：

```bash
# 方式一：当前终端
export JWT_SECRET=你的足够长且随机的密钥
docker compose up -d

# 方式二：用 .env 文件（推荐）
echo "JWT_SECRET=你的足够长且随机的密钥" >> .env
docker compose up -d
```

生产环境务必用强随机密钥，不要用示例里的 `change-me-in-production`。

---

### ② 数据库连接失败

**现象**：日志里出现 `服务器启动失败`、Prisma 连接超时或 `P1001` 等。

**原因**：`DATABASE_URL` 不对，或 postgres 尚未就绪（一般有 `depends_on: postgres + condition: service_healthy` 时较少见）。

**处理**：

- 确认 `DATABASE_URL` 与 postgres 服务一致：用户 `learnflow_user`，库名 `learnflow`，主机为服务名 `postgres`，端口 `5432`。
- 若使用 `.env`，确保 `POSTGRES_PASSWORD` 与 `DATABASE_URL` 里的密码一致。

---

### ③ 健康检查过早 / 启动慢

**现象**：日志里后端已正常打印“服务器运行在端口 3000”，但 compose 仍报 backend unhealthy。

**原因**：`start_period`（例如 15s）内应用没来得及监听 3000 或首次 `curl /health` 未返回 2xx。

**处理**：在 `docker-compose.yml` 里适当加大 backend 的 `healthcheck.start_period`（例如 30s），并确认镜像里已安装 `curl`（当前 Dockerfile 已包含）。

---

### ④ 镜像内没有 curl（少见）

**现象**：健康检查报错类似 `curl not found` 或 `executable file not found`。

**原因**：使用的 Dockerfile 未安装 `curl`。

**处理**：确保 backend 使用的 Dockerfile 里有：`RUN apk add --no-cache curl`（Alpine）或等效安装。当前仓库内 `server/Dockerfile` 已包含，若使用自定义 Dockerfile 请检查。

---

## 3. 快速自检清单

| 检查项           | 命令或方法 |
|------------------|------------|
| 看 backend 日志  | `docker compose logs backend` |
| 是否设置 JWT     | `echo $JWT_SECRET` 或查看 `.env` 中 `JWT_SECRET` |
| postgres 是否健康 | `docker compose ps` 中 postgres 为 healthy |
| backend 当前状态 | `docker compose ps` 中 backend 为 Up 还是 Restarting |

---

## 4. 建议：用 .env 管理敏感配置

在项目根目录创建 `.env`（不要提交到 git），例如：

```env
JWT_SECRET=请替换为足够长的随机字符串
POSTGRES_PASSWORD=你的数据库密码
```

然后执行：

```bash
docker compose up -d
```

Compose 会自动把 `.env` 里的变量注入到服务中，可避免漏设 `JWT_SECRET` 导致的 backend 启动即退出。
