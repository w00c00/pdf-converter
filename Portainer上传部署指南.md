# PDF转换器 - Portainer部署方案

## ⚠️ YAML Stack的局限性
Portainer的Stack编辑器不支持复杂的Shell heredoc语法。推荐使用以下两种方案之一
---

## 🎯 方案A: 直接上传项目文件（推荐，最简单）

### 步骤1: 在Portainer中创建容器
1. 进入Portainer: http://127.0.0.1:9000
2. 点击左侧 **"Containers"**
3. 点击 **"+ Add container"**

### 步骤2: 配置容器

填写以下信息：
**基础配置**:
- **Name**: `pdf-converter`
- **Image**: `node:18-alpine`

**端口映射**:
- 点击 **"+ Publish a new port"**
- **Host Port**: `3456`
- **Container Port**: `3456`

**环境变量**:
- 点击 **"+ Add an environment variable"**
  - Name: `PORT`
  - Value: `3456`
- 点击 **"+ Add an environment variable"**
  - Name: `NODE_ENV`
  - Value: `production`
- 点击 **"+ Add an environment variable"**
  - Name: `BASE_URL`
  - Value: `http://127.0.0.1:3456`
- 点击 **"+ Add an environment variable"**
  - Name: `CLOUDCONVERT_API_KEY`
  - Value: `(你的API密钥，可选)`

**Volumes**:
- 点击 **"+ Add a volume"**
  - **Container**: `/app/uploads`
  - **Host**: `pdf-uploads`

**Volumes**:
- 点击 **"+ Add a volume"**
  - **Container**: `/app/outputs`
  - **Host**: `pdf-outputs`

### 步骤3: 创建持久化目录
在Portainer的Web终端中：
1. 点击左侧 **"Volumes"**
2. 点击 **"+ Create a volume"**
3. Name: `pdf-uploads`
4. 点击 **"Create the volume"**
5. 重复创建 `pdf-outputs`

### 步骤4: 复制项目文件到容器
创建容器后，通过Web终端：
```bash
# 进入容器
docker exec -it pdf-converter sh

# 安装必要工具
apk add --no-cache curl git

# 创建目录
mkdir -p /app/uploads /app/outputs

# 创建package.json
cat > /app/package.json << 'EOF'
{
  "name": "pdf-converter",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "uuid": "^9.0.1"
  }
}
EOF

# 安装依赖
cd /app
npm install

# 创建server.js
cat > /app/server.js << 'SERVEREOF'
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3456;
const API_KEY = process.env.CLOUDCONVERT_API_KEY;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const OUTPUT_DIR = path.join(__dirname, 'outputs');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, uuidv4() + '-' + file.originalname)
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/convert', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
        const format = req.body.format;
        if (!['docx', 'jpg'].includes(format)) return res.status(400).json({ success: false, error: 'Invalid format' });

        if (!API_KEY) {
            const result = await mockConversion(req.file, format);
            return res.json(result);
        }

        const result = await convertWithCloudConvert(req.file, format, API_KEY);
        res.json(result);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

async function convertWithCloudConvert(file, format, apiKey) {
    const outputFormat = format === 'jpg' ? 'jpg' : 'docx';
    try {
        const createJobResponse = await axios.post('https://api.cloudconvert.com/v2/jobs', {
            tasks: {
                'upload-file': { operation: 'import/upload' },
                'convert-file': { operation: 'convert', input: 'upload-file', output_format: outputFormat },
                'export-file': { operation: 'export/url', input: 'convert-file' }
            }
        }, { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } });

        const job = createJobResponse.data.data;
        const uploadTask = job.tasks.find(t => t.name === 'upload-file');
        await axios.put(uploadTask.result.form.url, fs.createReadStream(file.path), { headers: { 'Content-Type': 'application/pdf' } });

        let jobStatus = job.status;
        while (jobStatus === 'pending' || jobStatus === 'processing') {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const statusResponse = await axios.get(`https://api.cloudconvert.com/v2/jobs/${job.id}`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            jobStatus = statusResponse.data.data.status;
        }

        if (jobStatus === 'finished') {
            const exportTask = job.tasks.find(t => t.name === 'export-file');
            const downloadUrl = exportTask.result.files[0].url;
            const filename = exportTask.result.files[0].filename;
            const outputFilename = uuidv4() + '-' + filename;
            const outputPath = path.join(OUTPUT_DIR, outputFilename);
            const fileResponse = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(outputPath, fileResponse.data);
            fs.unlinkSync(file.path);
            return { success: true, downloadUrl: '/download/' + outputFilename, filename };
        } else {
            throw new Error('Conversion failed');
        }
    } catch (error) {
        console.error('CloudConvert API error:', error);
        throw error;
    }
}

async function mockConversion(file, format) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const outputExtension = format === 'jpg' ? 'jpg' : 'docx';
    const outputFilename = uuidv4() + '.converted.' + outputExtension;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    fs.writeFileSync(outputPath, Buffer.from('Mock conversion - configure CLOUDCONVERT_API_KEY for real conversion'));
    fs.unlinkSync(file.path);
    return { success: true, downloadUrl: '/download/' + outputFilename, filename: 'converted.' + outputExtension };
}

app.get('/download/:filename', (req, res) => {
    const filePath = path.join(OUTPUT_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.download(filePath);
});

app.listen(PORT, () => {
    console.log('PDF Converter running on http://localhost:' + PORT);
    console.log('API Key:', API_KEY ? 'Configured' : 'Not configured (mock mode)');
});
SERVEREOF

# 启动服务
node server.js
```

### 步骤5: 保持容器运行

如果需要保持容器在后台运行：
1. 停止当前的交互式会话
2. 重启容器并设置command为 `node server.js`

---

## 🎯 方案B: 使用Docker Volume（需要GitHub仓库）
如果你有GitHub仓库：
1. 创建GitHub仓库，上传项目文件
2. 在Stack中使用：

```yaml
command: >
  sh -c "apk add --no-cache git &&
         git clone https://github.com/YOUR_USERNAME/pdf-converter.git /app &&
         cd /app &&
         npm install &&
         node server.js"
```

---

## 📋 快速检查清单
容器创建后确认：

- [ ] 容器状态 **Running**
- [ ] 端口: `3456:3456`
- [ ] 环境变量: `PORT=3456`
- [ ] 环境变量: `BASE_URL=http://127.0.0.1:3456`
- [ ] Volumes: `/app/uploads`, `/app/outputs`

访问测试: http://127.0.0.1:3456

---

## 🆘 遇到问题？
请告诉我：
1. 容器创建到哪一步？
2. 看到的错误信息？
3. 截图或错误日志？
