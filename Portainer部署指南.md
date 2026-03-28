# PDF转换器 - Portainer部署指南

## 📋 部署前准备
### 你需要提供的信息：
1. **Portainer管理地址**（例如：http://192.168.1.100:9000）
2. **API Token** 或用户名/密码
3. **你的CloudConvert API密钥**（可选，如果想在Docker中使用）

---

## 🚀 方法1：通过Portainer Web界面部署（推荐）

### 步骤1: 访问Portainer

在浏览器中打开你的Portainer地址，例如：
```
http://192.168.1.100:9000
```

### 步骤2: 登录

使用你的用户名密码或API Token登录

### 步骤3: 选择环境

1. 点击左侧菜单 **"Environments"** → **"端点"**
2. 选择你要部署的目标环境（Local 或 Docker）
### 步骤4: 创建Stack

**方式A: 从文件创建**

1. 点击左侧菜单 **"Stacks"** → **"堆栈"**
2. 点击 **"+ Add stack"** → **"添加堆栈"**
3. 选择 **"Upload"** → **"上传"**
4. 上传 `portainer-stack.yml` 文件

**方式B: 从Web Editor创建**

1. 点击左侧菜单 **"Stacks"**
2. 点击 **"+ Add stack"**
3. 选择 **"Web editor"**
4. 复制 `portainer-stack.yml` 的内容粘贴进来
### 步骤5: 配置环境变量

在Web editor中找到这一行：
```yaml
- CLOUDCONVERT_API_KEY=${CLOUDCONVERT_API_KEY}
```

修改为：
```yaml
- CLOUDCONVERT_API_KEY=你的实际API密钥
```

**或者**：在Portainer的"Env"区域添加：
```
Variable: CLOUDCONVERT_API_KEY
Value: 你的API密钥
```

### 步骤6: 部署

1. 输入Stack名称：`pdf-converter`
2. 点击 **"Deploy the stack"** → **"部署堆栈"**
3. 等待部署完成

### 步骤7: 验证

1. 查看容器状态（应该显示Running）
2. 查看日志确认无错误
3. 访问 http://服务器IP:3000

---

## 🔧 方法2：通过Portainer API部署

如果你想通过命令行部署，可以使用以下方法：
### 1. 获取API Token

在Portainer中：
1. 点击右上角用户头像
2. 选择 **"My account"** → **"我的账户"**
3. 点击 **"Create token"** → **"创建令牌"**
4. 保存生成的Token

### 2. 测试连接

```bash
# 替换为你的实际地址和Token
PORTAINER_URL="http://192.168.1.100:9000"
PORTAINER_TOKEN="pcf_xxxxxxxxxxxxx"

# 获取端点列表
curl -X GET \
  -H "Authorization: Bearer $PORTAINER_TOKEN" \
  "$PORTAINER_URL/api/users"
```

### 3. 创建Stack

```bash
# 创建Stack
curl -X POST \
  -H "Authorization: Bearer $PORTAINER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "pdf-converter",
    "StackFileContent": "...(portainer-stack.yml的内容)..."
  }' \
  "$PORTAINER_URL/api/stacks"
```

---

## ⚙️ 高级配置

### 修改端口

如果3000端口被占用，修改 `portainer-stack.yml` 中的端口映射：
```yaml
ports:
  - "8080:3000"  # 将容器内的3000映射到主机的8080
```

### 修改BASE_URL

确保 `BASE_URL` 指向正确的地址：
```yaml
- BASE_URL=http://你的公网IP或域名:3000
```

### 添加HTTPS

如果需要HTTPS，需要在前面加Nginx或Traefik作为反向代理：
```yaml
services:
  pdf-converter:
    image: node:18-alpine
    # ... 其他配置 ...

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - pdf-converter
```

---

## 🔍 故障排除

### 容器启动失败

1. 查看容器日志：
   - 在Portainer中点击容器 → **"Logs"**

2. 常见错误：
   - **端口占用**: 修改端口映射
   - **权限问题**: 检查volume路径
   - **网络问题**: 检查API连接

### 无法访问

1. 检查防火墙：
   ```bash
   # 开放3000端口
   sudo ufw allow 3000
   # 或者
   sudo firewall-cmd --add-port=3000/tcp --permanent
   ```

2. 检查端口映射：
   ```bash
   docker ps
   # 确认PORTS列显示0.0.0.0:3000->3000/tcp
   ```

### API密钥不生效
1. 确认.env文件或环境变量配置正确
2. 重启容器让配置生效
---

## 📊 监控和维护
### 查看状态
```bash
# 查看容器状态
docker ps | grep pdf-converter

# 查看资源使用
docker stats pdf-converter
```

### 查看日志

```bash
# 实时日志
docker logs -f pdf-converter

# 最新100行
docker logs --tail 100 pdf-converter
```

### 重启服务

```bash
docker restart pdf-converter
```

---

## 🆘 需要帮助？

请告诉我？
1. **Portainer地址**是什么？
2. **API Token**你已经生成了吗？
3. 你想要：
   - A) 我给你详细的部署步骤，你自己操作
   - B) 你把Token给我，我帮你通过API部署

---

## 📝 快速参考
### Portainer Stack文件位置
```
e:\mining\mining_proxy\pdf-converter\portainer-stack.yml
```

### 关键配置
- **容器名称**: pdf-converter
- **端口**: 3000
- **数据卷**: uploads, outputs
- **环境变量**: CLOUDCONVERT_API_KEY (可选)
