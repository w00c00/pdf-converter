# PDF转换器 - Portainer手动部署指南

## ⚠️ API Token验证失败

通过API部署时遇到Token认证问题。请使用以下**手动部署方法**
---

## 🚀 手动部署步骤

### 步骤1: 访问Portainer

在浏览器中打开：
```
http://127.0.0.1:9000
```

### 步骤2: 登录

使用你的Portainer用户名和密码登录

### 步骤3: 进入Stacks

1. 点击左侧菜单 **"Stacks"**（堆栈）
2. 点击页面右上角的 **"+ Add stack"**（添加堆栈）

### 步骤4: 选择构建方式

选择 **"Web editor"**（Web编辑器）

### 步骤5: 配置Stack

**Stack名称**：`pdf-converter`

在Web编辑器中**粘贴以下内容**：
```yaml
version: '3.8'

services:
  pdf-converter:
    image: node:18-alpine
    container_name: pdf-converter
    restart: unless-stopped
    ports:
      - "3456:3456"
    environment:
      - NODE_ENV=production
      - PORT=3456
      - BASE_URL=http://127.0.0.1:3456
      - CLOUDCONVERT_API_KEY=
    volumes:
      - pdf-uploads:/app/uploads
      - pdf-outputs:/app/outputs
    working_dir: /app
    command: sh -c "npm install && node server.js"

volumes:
  pdf-uploads:
    driver: local
  pdf-outputs:
    driver: local
```

### 步骤6: 配置环境变量（可选）

如果你有CloudConvert API密钥：
1. 在页面的 **"Environment variables"** 部分
2. 点击 **"+ Add an environment variable"**
3. 输入：
   - **Name**: `CLOUDCONVERT_API_KEY`
   - **Value**: 你的API密钥

### 步骤7: 部署

1. 点击页面底部的 **"Deploy the stack"** 按钮
2. 等待部署完成（约1-2分钟）
### 步骤8: 验证

部署成功后：

1. 点击左侧 **"Containers"**（容器）
2. 确认 `pdf-converter` 容器状态为 **Running**
3. 点击容器查看日志，确认无错误

### 步骤9: 访问

打开浏览器访问：
```
http://127.0.0.1:3456
```

---

## 📋 重要配置说明

### 端口映射
- 容器内端口：**3456**
- 主机端口：**3456**
- 如果3456被占用，修改为其他端口（例如 `8080:3456`）
### BASE_URL
- 已配置为：`http://127.0.0.1:3456`
- 这是下载文件时使用的地址
- 请确保修改为你的实际服务器IP

### 环境变量
- `CLOUDCONVERT_API_KEY`: 可选，不填则使用模拟模式
- `PORT`: 容器内端口，保持3456
- `BASE_URL`: 访问地址

---

## 🔧 如果需要修改配置
### 修改访问端口

例如改为8080端口：
```yaml
    ports:
      - "8080:3456"
```

同时更新BASE_URL：
```yaml
      - BASE_URL=http://127.0.0.1:8080
```

### 添加API密钥

在Environment variables中添加：

```yaml
CLOUDCONVERT_API_KEY: 你的密钥
```

---

## 📊 部署后检查
### 1. 查看容器状态
在Portainer中：
- **Status**: 应该显示 Running
- **Image**: node:18-alpine
- **Ports**: 0.0.0.0:3456->3456/tcp

### 2. 查看日志

点击容器 → **Logs**

正常日志应该显示：
```
✅ PDF转换器服务运行在 http://localhost:3456
🔑 CloudConvert API密钥: 未配置(使用模拟模式)
```

### 3. 访问测试

打开浏览器访问：
```
http://127.0.0.1:3456
```

应该能看到PDF转换器界面
---

## 🆘 故障排除

### 容器启动失败

1. 查看容器日志
2. 常见问题：
   - **端口占用**: 3456端口被占用，修改端口映射
   - **镜像下载失败**: 检查网络连接
   - **权限问题**: 检查volume权限

### 无法访问

1. 检查防火墙：
   ```bash
   sudo ufw allow 3456
   ```

2. 检查端口映射：
   ```bash
   docker ps | grep pdf-converter
   ```

3. 检查云服务器安全组：
   - 开放3456端口的入站规则
### 502 Bad Gateway

可能是容器未完全启动，等待1-2分钟后再试
---

## 📁 相关文件

项目中的配置文件：
- `portainer-stack.yml` - Portainer Stack配置
- `docker-compose.yml` - Docker Compose配置
- `Dockerfile` - Docker镜像配置

---

## ✅ 部署检查清单
- [ ] Stack名称: pdf-converter
- [ ] 镜像: node:18-alpine
- [ ] 端口: 3456:3456
- [ ] BASE_URL: http://127.0.0.1:3456
- [ ] CLOUDCONVERT_API_KEY: (可选)
- [ ] 容器状态: Running
- [ ] 访问测试: http://127.0.0.1:3456

---

## 🎉 完成！
部署成功后，你可以：

1. **访问应用**: http://127.0.0.1:3456
2. **上传PDF**: 拖放或选择PDF文件
3. **转换格式**: 选择Word或JPG
4. **下载结果**: 点击下载转换后的文件

---

## 📞 需要帮助？

如果遇到问题，请告诉我：
1. 你卡在哪一步？
2. 看到什么错误信息？
3. 截图或复制错误日志？
