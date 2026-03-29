# CloudConvert API 完整使用指南

## 📊 定价信息

CloudConvert **不是完全免费** 的，但提供了一定的免费额度
### 免费额度
- **免费注册账户**: 25分钟转换时间/天
- 积分系统: 根据转换类型和时间消耗积分
  - PDF转Word (DOCX): **4积分/次*（最低消费）
  - PDF转JPG: **1积分/次*（最低消费）
  - 普通转换: 1积分/分钟

### 付费套餐
| 套餐 | 价格 | 转换时间 |
|------|------|----------|
| Free | $0 | 25分钟/天 |
| Starter | $9/月 | 100分钟/月 |
| Professional | $29/月 | 500分钟/月 |
| Business | $79/月 | 2000分钟/月 |

## 🔑 获取API密钥

### 步骤1: 注册账户
1. 访问 https://cloudconvert.com
2. 点击"Sign Up"注册账户
3. 验证邮箱

### 步骤2: 获取API密钥
1. 登录账户
2. 访问 https://cloudconvert.com/dashboard/api
3. 点击"Create API Key"
4. 选择权限范围（建议选择所有Tasks & Jobs权限）
5. 复制API密钥

### 步骤3: 配置到项目
创建 `.env` 文件（复制自 `.env.example`）：
```env
CLOUDCONVERT_API_KEY=your_api_key_here
BASE_URL=http://localhost:3000
PORT=3000
```

## 📝 API使用示例

### Node.js中使用
```javascript
const axios = require('axios');

const API_KEY = 'your_api_key';

// 创建转换任务
async function createJob(filePath, outputFormat) {
    const response = await axios.post(
        'https://api.cloudconvert.com/v2/jobs',
        {
            tasks: {
                'upload-file': {
                    operation: 'import/upload'
                },
                'convert-file': {
                    operation: 'convert',
                    input: 'upload-file',
                    output_format: outputFormat
                },
                'export-file': {
                    operation: 'export/url',
                    input: 'convert-file'
                }
            }
        },
        {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );

    return response.data.data;
}
```

## 🆓 免费替代方案

如果你不想使用付费API，可以考虑以下免费替代方案
### 方案1: 使用本地转换库（推荐）
使用 `pdf2pic` 和 `mammoth` 等本地库
```bash
npm install pdf2pic mammoth
```

**优点**：
- 完全免费
- 离线可用
- 无文件大小限制
**缺点**：
- 需要服务器有足够的处理能力
- 需要安装ImageMagick等依赖
### 方案2: 使用免费在线API

1. **PDFLayer** (免费100请求/月)
   - https://pdflayer.com
   - 主要用于PDF创建，不是转换
2. **DocPub** (免费500页/月)
   - https://www.docpub.org
   - PDF转HTML, ePub
3. **Zamzar** (免费1GB/月)
   - https://www.zamzar.com
   - 需要上传到第三方
### 方案3: 自建转换服务

使用开源库自建
- **LibreOffice**: 命令行转换PDF
- **ImageMagick**: PDF转图片
- **unoconv**: Linux下的文档转换

## 🔧 项目配置

### 当前配置
项目已配置CloudConvert支持，修改 `server.js`:

```javascript
// 使用真实API（需配置API密钥）
if (process.env.CLOUDCONVERT_API_KEY) {
    const result = await convertWithCloudConvert(req.file, format, apiKey);
}

// 使用模拟模式（无需配置，用于测试）
else {
    const result = await mockConversion(req.file, format);
}
```

### 切换到本地转换
如需使用免费本地库，修改 `server.js`:

```javascript
// 添加依赖
const { fromPath } = require('pdf2pic');
const mammoth = require('mammoth');

// PDF转JPG
async function convertToJpg(filePath, outputDir) {
    const convert = fromPath(filePath, {
        density: 100,
        saveFilename: 'converted',
        savePath: outputDir,
        format: 'jpg',
        width: 1200,
        height: 1200
    });

    const result = await convert(1); // 转换第一页
    return result;
}

// PDF转Word
async function convertToDocx(filePath, outputPath) {
    const result = await mammoth.convertToMarkdown({ path: filePath });
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    // 需要额外处理生成真正的DOCX
}
```

## ⚠️ 注意事项

1. **安全性**: 不要在客户端暴露API密钥
2. **隐私**: 上传文件到第三方服务可能涉及隐私问题
3. **限制**: 注意API的速率限制和每日配额
4. **成本**: 批量转换时注意成本控制
5. **备份**: 重要文件转换前先备份

## 📞 获取帮助

- 官方文档: https://cloudconvert.com/api/v2
- API状态: https://status.cloudconvert.com
- 支持邮箱: support@cloudconvert.com

## 💡 推荐方案

根据你的需求，推荐以下方案：
1. **个人使用/测试**: 使用模拟模式 + 免费API配额
2. **小规模使用**: CloudConvert Starter套餐（$9/月）
3. **大规模使用**: 自建LibreOffice服务 + 免费
4. **企业用户**: CloudConvert Enterprise定制方案
