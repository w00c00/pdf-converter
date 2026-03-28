# Docker部署失败修复指南

## 🔍 问题诊断

### 根本原因

经过分析，Docker部署失败的主要原因是：

#### 1. portainer-stack.yml配置错误

**原始配置问题**：
```yaml
command: >
  sh -c "
    apk add --no-cache git &&
    rm -rf /app/* &&
    git clone https://github.com/YOUR_USERNAME/pdf-converter.git /app ||  # ❌ 占位符未替换
    echo 'Git clone skipped, using inline files' &&  # ❌ 没有实际的inline files
    mkdir -p /app/uploads /app/outputs &&
    npm install express@4.18.2 multer@1.4.5-lts.1 axios@1.6.0 cors@2.8.5 uuid@9.0.1 &&
    node server.js  # ❌ server.js不存在，容器启动失败
  "
```

**问题详解**：
- `YOUR_USERNAME` 是占位符，没有替换为实际的GitHub用户名
- Git clone失败后，虽然有fallback逻辑，但没有实际提供server.js等文件
- 容器启动时找不到 `server.js`，导致立即退出

#### 2. 端口配置混乱

不同文件中端口配置不一致：
- `Dockerfile`: `EXPOSE 3456`
- `构建说明.md`: 提到端口 `3000`
- `README.md`: 提到端口 `3000`
- `docker-compose.yml`: 使用 `3456`

#### 3. 部署方式冲突

- **Dockerfile**: 设计用于本地构建（使用 `COPY` 命令）
- **portainer-stack.yml**: 设计用于在线构建（使用 `git clone`）
- 两种方式没有正确配合

---

## ✅ 修复方案

### 方案A: 使用修复后的docker-compose.yml（推荐用于本地部署）

**适用场景**：在本地机器构建并运行

**步骤**：

1. **使用修复后的配置文件**：
   ```bash
   # 使用修复后的docker-compose文件
   docker-compose -f docker-compose-fixed.yml up -d
   ```

2. **或者直接使用原文件**（已验证可用）：
   ```bash
   docker-compose up -d
   ```

3. **访问应用**：
   ```
   http://localhost:3456
   ```

---

### 方案B: 使用修复后的portainer-stack.yml（推荐用于Portainer部署）

**适用场景**：在Portainer中部署

**步骤**：

1. **登录Portainer**
   ```
   http://你的Portainer地址:9000
   ```

2. **创建Stack**
   - 点击左侧 "Stacks" → "Add stack"
   - 名称输入: `pdf-converter`

3. **粘贴修复后的配置**
   - 选择 "Web editor"
   - 复制 `portainer-stack-fixed.yml` 的全部内容
   - 粘贴到编辑器

4. **修改配置**（重要！）：
   ```yaml
   environment:
     - BASE_URL=http://你的服务器IP:3456  # 替换为实际IP
     - CLOUDCONVERT_API_KEY=你的API密钥   # 可选，不设置则使用模拟模式
   ```

5. **部署**
   - 点击 "Deploy the stack"
   - 等待1-2分钟（首次需要安装npm依赖）

6. **验证**
   - 查看容器状态是否为 "Running"
   - 点击容器查看日志，确认无错误
   - 访问 `http://你的服务器IP:3456`

---

### 方案C: 使用Dockerfile本地构建（最可靠）

**适用场景**：需要完全控制构建过程

**步骤**：

1. **本地构建镜像**：
   ```bash
   cd e:\mining\mining_proxy\pdf-converter

   # 构建镜像
   docker build -t pdf-converter:latest .
   ```

2. **测试运行**：
   ```bash
   docker run -d \
     --name pdf-converter \
     -p 3456:3456 \
     -e CLOUDCONVERT_API_KEY=你的密钥 \
     -v $(pwd)/uploads:/app/uploads \
     -v $(pwd)/outputs:/app/outputs \
     pdf-converter:latest
   ```

3. **导出镜像**（如需传输到其他服务器）：
   ```bash
   # 导出为tar文件
   docker save -o pdf-converter.tar pdf-converter:latest

   # 传输到服务器
   scp pdf-converter.tar user@服务器IP:/path/to/

   # 在服务器上加装
   docker load -i pdf-converter.tar
   ```

4. **在服务器上运行**：
   ```bash
   docker run -d \
     --name pdf-converter \
     -p 3456:3456 \
     -e CLOUDCONVERT_API_KEY=你的密钥 \
     -v /path/to/uploads:/app/uploads \
     -v /path/to/outputs:/app/outputs \
     pdf-converter:latest
   ```

---

## 🔧 常见问题排查

### 问题1: 容器立即退出

**症状**：容器启动后状态变为 "Exited"

**排查方法**：
```bash
# 查看容器日志
docker logs pdf-converter

# 或者在Portainer中点击容器查看Logs标签
```

**常见原因**：
- 端口被占用
- 文件权限问题
- 依赖安装失败

**解决方案**：
```bash
# 检查端口占用
netstat -ano | findstr :3456

# 如果端口被占用，修改docker-compose.yml中的端口映射
ports:
  - "3457:3456"  # 改为其他端口
```

---

### 问题2: 健康检查失败

**症状**：容器显示 "unhealthy"

**排查方法**：
```bash
# 手动测试健康检查
docker exec pdf-converter wget --no-verbose --tries=1 --spider http://localhost:3456/
```

**常见原因**：
- 应用启动慢
- 端口配置错误

**解决方案**：
- 增加 `start_period` 时间（已从5s改为10s）
- 检查端口配置是否一致

---

### 问题3: 文件上传失败

**症状**：上传文件时返回错误

**排查方法**：
```bash
# 检查uploads目录权限
docker exec pdf-converter ls -la /app/uploads

# 检查磁盘空间
docker exec pdf-converter df -h
```

**解决方案**：
```bash
# 修复权限
docker exec -u root pdf-converter chown -R node:node /app/uploads
docker exec -u root pdf-converter chown -R node:node /app/outputs
```

---

### 问题4: API密钥不生效

**症状**：应用运行在模拟模式，无法实际转换

**排查方法**：
```bash
# 检查环境变量
docker exec pdf-converter env | grep CLOUDCONVERT
```

**解决方案**：
- 确保在docker-compose.yml或Portainer中正确设置了 `CLOUDCONVERT_API_KEY`
- 检查密钥是否有效（访问 https://cloudconvert.com/api/v2 验证）

---

## 📋 部署检查清单

### 部署前检查

- [ ] 确认端口3456未被占用
- [ ] 确认Docker和Docker Compose已安装
- [ ] 准备好CloudConvert API密钥（可选）
- [ ] 确认服务器防火墙已开放3456端口

### 部署后验证

- [ ] 容器状态为 "Running"
- [ ] 健康检查状态为 "healthy"
- [ ] 可以访问 http://服务器IP:3456
- [ ] 可以上传PDF文件
- [ ] 转换功能正常工作

---

## 🎯 推荐部署流程

### 对于Portainer用户（最简单）

1. 使用 `portainer-stack-fixed.yml`
2. 在Portainer中创建Stack
3. 粘贴配置并修改IP和API密钥
4. 部署并验证

### 对于本地开发用户

1. 使用 `docker-compose-fixed.yml` 或原 `docker-compose.yml`
2. 运行 `docker-compose up -d`
3. 访问 http://localhost:3456

### 对于生产环境

1. 使用Dockerfile本地构建
2. 导出镜像并传输到服务器
3. 在服务器上运行容器
4. 配置反向代理（如Nginx）和HTTPS

---

## 📞 获取帮助

如果仍有问题，请提供：

1. **错误日志**：
   ```bash
   docker logs pdf-converter
   ```

2. **容器状态**：
   ```bash
   docker ps -a | grep pdf-converter
   ```

3. **系统信息**：
   - 操作系统版本
   - Docker版本：`docker --version`
   - Docker Compose版本：`docker-compose --version`

---

## 📝 更新记录

- **2024-03-28**: 创建修复指南
- 修复了portainer-stack.yml中的git clone问题
- 统一了端口配置为3456
- 提供了三种部署方案
