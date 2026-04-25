# LearnFlow - 智能学习平台

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)

> 一个基于AI的智能学习平台，帮助用户制定个性化学习计划，跟踪学习进度，实现高效学习。

## ✨ 特性

- 🎯 **智能目标管理** - AI辅助制定学习目标和计划
- 📊 **进度可视化** - 直观的图表展示学习进度
- 🔄 **自适应学习** - 根据学习情况动态调整计划
- 📱 **响应式设计** - 支持多设备访问
- 🔒 **安全认证** - JWT + Passport认证系统
- 🚀 **Docker部署** - 一键部署，支持生产环境

## 🏗️ 技术架构

### 前端
- **React 19** - 现代化的用户界面
- **TypeScript** - 类型安全的开发体验
- **Vite** - 快速的构建工具
- **Tailwind CSS** - 实用优先的CSS框架
- **Chart.js** - 数据可视化图表
- **Mermaid** - 流程图渲染

### 后端
- **Node.js** - 高性能JavaScript运行时
- **Express** - 轻量级Web框架
- **TypeScript** - 类型安全的服务器代码
- **Prisma** - 现代化的数据库ORM
- **PostgreSQL** - 强大的关系型数据库
- **JWT** - 无状态身份认证

### 部署
- **Docker** - 容器化部署
- **Docker Compose** - 多服务编排
- **Nginx** - 反向代理和负载均衡
- **Alpine Linux** - 轻量级容器镜像

## 🚀 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose

### Monorepo 快速启动（推荐）

```bash
# 克隆项目
git clone https://github.com/xlj127317/learnflow.git
cd learnflow

# 一键安装依赖并启动
npm run setup

# 或分步执行
npm install          # 安装所有 workspace 依赖
npm run dev          # 同时启动前端和后端
```

### 本地开发

```bash
# 安装依赖（根目录执行一次即可）
npm install

# 配置环境变量
cp server/.env.example server/.env
# 编辑 .env 文件，配置数据库连接等信息

# 启动数据库
docker-compose up postgres -d

# 启动后端服务（新终端）
npm run dev:server

# 启动前端服务（新终端）
npm run dev:client
```

### Docker 部署

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 生产环境部署

针对 2 核 4GB 服务器的优化部署方案：

```bash
# 安装系统环境
chmod +x deploy/scripts/install-debian.sh
./deploy/scripts/install-debian.sh

# 部署应用
chmod +x deploy/scripts/deploy-debian.sh
./deploy/scripts/deploy-debian.sh start

# 查看状态
./deploy/scripts/deploy-debian.sh status
```

完整部署文档：[DEPLOYMENT.md](DEPLOYMENT.md)

## 📖 使用指南

### 1. 创建学习目标
- 设定明确的学习目标
- 选择目标完成日期
- 添加详细描述

### 2. 制定学习计划
- AI辅助生成学习计划
- 可视化流程图展示
- 灵活调整计划内容

### 3. 跟踪学习进度
- 记录每日学习情况
- 查看进度统计图表
- 获得学习建议

### 4. 管理学习任务
- 分解学习任务
- 设置任务优先级
- 标记任务完成状态

## 🔧 配置说明

### 环境变量

```bash
# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/learnflow

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# 服务器配置
NODE_ENV=production
PORT=3000
```

### 数据库迁移

```bash
# 生成Prisma客户端
npx prisma generate

# 执行数据库迁移
npx prisma migrate dev

# 查看数据库
npx prisma studio
```

## 📊 项目结构

```
learnflow/
├── client/                 # 前端 React 应用
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── contexts/      # React 上下文
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── services/      # API 服务
│   │   ├── types/         # TypeScript 类型定义
│   │   └── utils/         # 工具函数
│   ├── Dockerfile
│   └── nginx.conf
├── server/                 # 后端 Node.js 应用
│   ├── src/
│   │   ├── routes/        # API 路由
│   │   ├── services/      # 业务逻辑服务
│   │   ├── middleware/    # 中间件
│   │   ├── config/        # 配置文件
│   │   ├── shared/        # 共享工具
│   │   └── types/         # TypeScript 类型
│   ├── prisma/            # 数据库 Schema
│   └── Dockerfile
├── deploy/                 # 部署相关文件
│   ├── scripts/           # 部署脚本
│   │   ├── deploy-debian.sh
│   │   ├── install-debian.sh
│   │   └── deploy.sh
│   ├── DEPLOY-NGINX-SSL.md
│   ├── nginx-learnflow.conf
│   └── postgresql.conf
├── package.json            # Monorepo 根配置
├── docker-compose.yml      # Docker 服务编排
├── README.md               # 项目说明
├── DEPLOYMENT.md           # 部署指南
└── DEPLOY-TROUBLESHOOTING.md  # 问题排查
```

## 🧪 测试

```bash
# 运行后端测试（Jest）
npm test

# 运行前端 lint
npm run lint

# 类型检查
npm run build
```

## 📈 性能优化

- **前端优化**: 代码分割、懒加载、静态资源缓存
- **后端优化**: 数据库查询优化、API限流、缓存策略
- **部署优化**: 多阶段Docker构建、Nginx配置优化
- **系统优化**: 针对低配置服务器的资源限制和优化

## 🔒 安全特性

- **身份认证**: JWT + Passport认证
- **数据验证**: 输入验证和清理
- **SQL注入防护**: Prisma ORM保护
- **XSS防护**: 安全头配置
- **限流保护**: API请求频率限制
- **防火墙**: UFW防火墙配置
- **入侵防护**: Fail2ban配置

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 贡献方式

1. **报告Bug** - 在Issues中报告问题
2. **功能建议** - 提出新功能想法
3. **代码贡献** - 提交Pull Request
4. **文档改进** - 完善项目文档
5. **测试反馈** - 测试并提供反馈

### 开发流程

```bash
# Fork项目
git clone https://github.com/your-username/learnflow.git

# 创建功能分支
git checkout -b feature/your-feature

# 提交更改
git commit -m "feat: add your feature"

# 推送分支
git push origin feature/your-feature

# 创建Pull Request
```

### 代码规范

- 使用TypeScript进行类型安全开发
- 遵循ESLint和Prettier代码规范
- 编写清晰的代码注释
- 添加适当的测试用例

## 📄 许可证

本项目采用 [MIT许可证](LICENSE) - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户！

## 📞 联系我们

- **项目主页**: [https://github.com/your-username/learnflow](https://github.com/your-username/learnflow)
- **问题反馈**: [Issues](https://github.com/your-username/learnflow/issues)
- **功能建议**: [Discussions](https://github.com/your-username/learnflow/discussions)

---

⭐ 如果这个项目对您有帮助，请给我们一个Star！
