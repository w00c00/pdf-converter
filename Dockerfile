FROM node:18-bullseye-slim

# 安装 ImageMagick 和字体支持
RUN apt-get update && apt-get install -y \
    imagemagick \
    ghostscript \
    fonts-liberation \
    fontconfig \
    tini \
    && rm -rf /var/lib/apt/lists/*

# 允许 ImageMagick 读取 PDF (安全策略修改)
RUN sed -i 's/policy domain="coder" rights="none" pattern="PDF"/policy domain="coder" rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml || \
    sed -i 's/policy domain="coder" rights="none" pattern="PDF"/policy domain="coder" rights="read|write" pattern="PDF"/' /etc/ImageMagick-7/policy.xml

WORKDIR /app

# 先拷贝依赖文件
COPY package*.json ./

# 安装生产依赖
RUN npm install --production

# 拷贝代码
COPY . .

# 创建必要的目录并设置权限
RUN mkdir -p uploads outputs && \
    chown -R node:node /app

USER node

EXPOSE 3456

ENV PORT=3456
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3456/api/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]

# 默认运行免费版，因为它最稳定
CMD ["node", "server-free.js"]
