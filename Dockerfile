# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production

# 生成Prisma客户端
RUN npx prisma generate

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:18-alpine AS runner

WORKDIR /app

# 安装必要的系统依赖（用于Prisma）
RUN apk add --no-cache libc6-compat

# 复制package文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 从构建阶段复制编译后的文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# 更改文件所有权
RUN chown -R expressjs:nodejs /app

# 切换到非root用户
USER expressjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if(r.statusCode!==200)throw new Error(r.statusCode)})"

# 启动应用
CMD ["node", "dist/index.js"]