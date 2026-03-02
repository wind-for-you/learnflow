# 单阶段构建 — 跳过 tsc 编译，直接用 tsx 运行源码
# 使用 Debian 基础镜像，与宿主机一致且 Prisma 引擎（glibc+OpenSSL3）无兼容问题
FROM node:18-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    dumb-init \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --ignore-scripts
RUN npx prisma generate

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "tsx", "src/index.ts"]
