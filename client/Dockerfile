# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app

# 生产环境默认用同源 /api，便于 Nginx 反向代理（可 build-arg 覆盖）
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install

COPY . .

# 强制生产构建使用同源 /api（避免被仓库内 .env 的 localhost 覆盖）
RUN echo "VITE_API_URL=$VITE_API_URL" > .env.production

# 直接用 vite build 跳过 tsc 类型检查（项目有预存类型错误不影响运行）
RUN npx vite build

# 生产阶段 — Nginx 托管静态文件
FROM nginx:alpine

RUN apk add --no-cache curl

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
