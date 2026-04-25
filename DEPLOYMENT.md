# LearnFlow 部署指南

## 🎯 概述

本文档包含 LearnFlow 项目的完整部署方案，支持本地开发、Docker 部署和生产环境部署。

## 🏗️ 架构概览

```mermaid
graph TB
    User[用户浏览器] -->|HTTP/HTTPS| Nginx[Nginx 反向代理]
    Nginx -->|/ → 前端| Frontend[React 前端 :8080]
    Nginx -->|/api/* → 后端| Backend[Node.js 后端 :3000]
    Backend -->|数据操作| DB[(PostgreSQL :5432)]
    
    style Nginx fill:#f5f5f5,color:#333
    style Frontend fill:#61dafb
    style Backend fill:#68a063
    style DB fill:#336791
```

## 📋 系统要求

| 项目 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2核 | 4核 |
| 内存 | 4GB RAM | 8GB RAM |
| 存储 | 20GB | 50GB SSD |
| 系统 | Debian 12 / Ubuntu 18.04+ | Debian 12 (Bookworm) |
| Docker | 20.10+ | 最新稳定版 |
| Node.js | 18+ | 20 LTS |

## 🚀 快速开始

### 方式一：本地开发部署

```bash
# 1. 克隆项目
git clone https://github.com/xlj127317/learnflow.git
cd learnflow

# 2. 安装依赖
cd client && npm install
cd ../server && npm install

# 3. 配置环境变量
cp server/.env.example server/.env
# 编辑 .env 文件，配置数据库连接等信息

# 4. 启动数据库
docker-compose up postgres -d

# 5. 启动后端服务
cd server
npm run dev

# 6. 启动前端服务（新终端）
cd ../client
npm run dev
```

### 方式二：Docker 一键部署

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 方式三：生产环境部署（Debian 服务器）

```bash
# 1. 克隆项目
git clone https://github.com/xlj127317/learnflow.git
cd learnflow

# 2. 给脚本执行权限
chmod +x deploy/scripts/install-debian.sh
chmod +x deploy/scripts/deploy-debian.sh

# 3. 运行系统安装脚本
./deploy/scripts/install-debian.sh

# 4. 配置环境变量
cp env.production.example .env
nano .env  # 编辑配置，填入实际值

# 5. 部署应用
./deploy/scripts/deploy-debian.sh start
./deploy/scripts/deploy-debian.sh status
```

## 🔧 环境变量配置

### 配置文件说明

| 文件 | 用途 | 推荐度 |
|------|------|--------|
| `server/.env.example` | 服务端开发环境配置 | ⭐⭐⭐ |
| `env.production.example` | 生产环境完整配置 | ⭐⭐⭐⭐⭐ |
| `.env` | 实际使用的配置文件（不提交到 Git） | - |

### 核心环境变量

```bash
# === 数据库配置 ===
DATABASE_URL=postgresql://learnflow_user:YOUR_PASSWORD@postgres:5432/learnflow
POSTGRES_DB=learnflow
POSTGRES_USER=learnflow_user
POSTGRES_PASSWORD=YOUR_DB_PASSWORD

# === JWT 配置 ===
JWT_SECRET=YOUR_JWT_SECRET_KEY_HERE
JWT_EXPIRES_IN=7d

# === 服务器配置 ===
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# === AI 服务配置（OpenRouter） ===
OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY_HERE
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=gpt-3.5-turbo
OPENROUTER_MAX_TOKENS=4000
OPENROUTER_TEMPERATURE=0.7

# === 安全配置 ===
CORS_ORIGIN=http://127.0.0.1:8080
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 开发环境配置

本地开发时，数据库连接使用 localhost：

```bash
DATABASE_URL=postgresql://learnflow_user:learnflow_password@localhost:5432/learnflow
VITE_API_URL=http://localhost:3000/api
```

### 生产环境配置

生产环境部署时，数据库连接使用 Docker 服务名：

```bash
DATABASE_URL=postgresql://learnflow_user:YOUR_PASSWORD@postgres:5432/learnflow
VITE_API_URL=http://127.0.0.1:3000/api
```

### 生成安全密钥

```bash
# 生成数据库密码（32 字符）
openssl rand -base64 32

# 生成 JWT 密钥（64 字符）
openssl rand -base64 64
```

## 🌐 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端应用 | http://localhost:8080 | 用户界面 |
| 后端 API | http://localhost:8080/api | REST API |
| 健康检查 | http://localhost:8080/health | 服务状态 |
| 数据库 | localhost:5432 | PostgreSQL |

## 📊 服务说明

### 前端服务（Frontend）

| 项目 | 说明 |
|------|------|
| 技术栈 | React 19 + Vite + TypeScript |
| 容器 | Nginx Alpine |
| 内部端口 | 80 |
| 功能 | 用户界面，支持 SPA 路由 |

### 后端服务（Backend）

| 项目 | 说明 |
|------|------|
| 技术栈 | Node.js + Express + TypeScript |
| 容器 | Node.js 18 Debian |
| 内部端口 | 3000 |
| 功能 | REST API，业务逻辑 |

### 数据库服务（PostgreSQL）

| 项目 | 说明 |
|------|------|
| 版本 | PostgreSQL 15 |
| 端口 | 5432 |
| 数据卷 | postgres_data（持久化） |

### 反向代理（Nginx）

| 项目 | 说明 |
|------|------|
| 版本 | Nginx Alpine |
| 外部端口 | 8080 |
| 功能 | 统一入口、API 路由 |

## 🔒 安全配置

### 生产环境注意事项

1. **修改默认密码**：更改 `POSTGRES_PASSWORD` 和 `JWT_SECRET`
2. **限制端口访问**：只开放必要的端口
3. **启用 HTTPS**：配置 SSL 证书
4. **防火墙配置**：限制 IP 访问范围
5. **定期备份**：配置数据库备份策略

### 防火墙规则

```bash
# 默认策略
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许的服务
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 限制 Docker 端口访问
sudo ufw allow from 127.0.0.1 to any port 5432
sudo ufw allow from 127.0.0.1 to any port 3000
```

### SSL 证书配置

参考 `deploy/DEPLOY-NGINX-SSL.md` 进行 HTTPS 配置。

## 📈 性能优化

### 资源分配（2核4GB 服务器）

| 服务 | 内存限制 | CPU 限制 |
|------|---------|---------|
| PostgreSQL | 512MB | 0.5 核 |
| Node.js 后端 | 512MB | 0.5 核 |
| Nginx 前端 | 256MB | 0.25 核 |
| Nginx 代理 | 256MB | 0.25 核 |
| 系统预留 | 2.5GB | 0.5 核 |

### PostgreSQL 优化配置

```bash
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
max_connections = 50
random_page_cost = 1.1  # SSD 优化
```

### Node.js 优化配置

```bash
NODE_OPTIONS="--max-old-space-size=512"
```

### Nginx 优化配置

```bash
worker_processes 2;
worker_connections 512;
keepalive_timeout 30;
gzip_comp_level 4;  # 降低压缩级别，节省 CPU
```

## 🔍 监控和维护

### 服务管理命令

```bash
# 使用部署脚本管理
./deploy/scripts/deploy-debian.sh start
./deploy/scripts/deploy-debian.sh stop
./deploy/scripts/deploy-debian.sh restart
./deploy/scripts/deploy-debian.sh status
./deploy/scripts/deploy-debian.sh logs
./deploy/scripts/deploy-debian.sh health
./deploy/scripts/deploy-debian.sh monitor
```

### Docker 管理命令

```bash
# 查看资源使用情况
docker stats

# 清理未使用的资源
docker image prune
docker container prune
docker volume prune

# 备份数据库
docker-compose exec postgres pg_dump -U learnflow_user learnflow > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U learnflow_user -d learnflow < backup.sql
```

### 自动备份

```bash
# 数据库备份脚本（每天凌晨 2 点执行）
/opt/learnflow/backup.sh

# 备份策略
- 每天自动备份
- 保留最近 7 天备份
- 自动压缩备份文件
- 清理过期备份
```

## 🚨 故障排除

### 常见问题

#### 1. 内存不足

```bash
# 检查内存使用
free -h
docker stats

# 解决方案
- 重启占用内存较多的容器
- 检查是否有内存泄漏
- 考虑增加 swap 空间
```

#### 2. 磁盘空间不足

```bash
# 检查磁盘使用
df -h
docker system df

# 解决方案
- 清理 Docker 镜像和容器
- 清理日志文件
- 清理备份文件
```

#### 3. 服务无法启动

```bash
# 查看服务日志
docker-compose logs backend

# 检查端口占用
sudo netstat -tulpn | grep :80

# 检查 Docker 状态
docker info
```

#### 4. 后端启动失败（JWT_SECRET 未设置）

**现象**：日志显示 `缺少必需的环境变量: JWT_SECRET`

**处理**：

```bash
# 设置 JWT_SECRET 后重启
export JWT_SECRET=你的随机密钥
docker-compose up -d
```

#### 5. 数据库连接失败

**现象**：Prisma 连接超时或 `P1001` 错误

**处理**：

- 确认 `DATABASE_URL` 与 postgres 服务一致
- 用户 `learnflow_user`，库名 `learnflow`
- 主机为服务名 `postgres`，端口 `5432`

更多问题排查参考 `DEPLOY-TROUBLESHOOTING.md`。

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| `DEPLOY-TROUBLESHOOTING.md` | 部署问题排查指南 |
| `deploy/DEPLOY-NGINX-SSL.md` | Nginx 反向代理 + HTTPS 配置 |
| `AI-SERVICE-SETUP.md` | AI 服务（OpenRouter）配置指南 |

## 🤝 技术支持

如果遇到问题，请：

1. 查看服务日志：`docker-compose logs backend`
2. 执行健康检查：`./deploy/scripts/deploy-debian.sh health`
3. 检查服务状态：`docker-compose ps`
4. 查看问题排查文档：`DEPLOY-TROUBLESHOOTING.md`
