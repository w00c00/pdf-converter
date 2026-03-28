# 📄 PDF Converter Pro (Local Free Edition)

这是一个功能强大的本地 PDF 转换器，支持将 PDF 高保真地转换为 Word (DOCX) 文档和长图 (JPG/PNG)。

与市面上依赖昂贵 API 的转换器不同，本项目 **100% 免费**，所有转换逻辑均在本地容器内通过 **LibreOffice** 和 **ImageMagick** 引擎完成，确保了隐私安全和排版还原度。

## ✨ 核心特性

- 🚀 **高保真转换**：内置 LibreOffice 引擎，支持 PDF 中的表格、字体、加粗及排版深度还原。
- 🖼️ **全页长图生成**：自动将 PDF 所有页面垂直合并为一张高画质 JPG/PNG。
- 💰 **完全免费**：无需注册，不限制文件大小（仅受服务器内存限制），无需任何 API Key。
- 🐳 **一键 Docker 部署**：支持 Docker Compose 和 Portainer，内置 Debian + JRE + LibreOffice 环境。
- 🌍 **中文字体优化**：内置文泉驿微米黑、Noto CJK 等中文字体，彻底解决中文乱码和错位。

## 🛠️ 技术栈

- **后端**: Node.js 18 (Express)
- **引擎**: 
  - Word 转换: LibreOffice Writer & Draw
  - 图片转换: ImageMagick (Ghostscript 驱动)
- **前端**: 原生 JavaScript + Vanilla CSS (响应式设计)

## 🚀 快速开始 (Docker)

如果你已经安装了 Docker，只需在项目根目录运行：

```bash
docker-compose up -d
```

访问地址: `http://localhost:3456`

## 📦 局域网/服务器部署 (Portainer)

本项目已针对局域网服务器进行了深度优化。你可以直接使用 `docker-compose.yml` 中的配置在 Portainer 中创建 Stack。

**环境要求**:
- 基础镜像: `node:18-bullseye-slim`
- 内存建议: 1GB+ (LibreOffice 启动较占内存)

## 📂 项目结构

```text
├── server.js           # 后端核心逻辑
├── index.html          # 转换器主界面
├── app.js              # 前端交互逻辑
├── styles.css          # UI 样式
├── Dockerfile          # 容器构建配置
└── docker-compose.yml  # 本地开发编排
```

## 📝 许可证

MIT License.

---
**💡 提示**: 
1. 第一次启动时，容器会自动安装约 600MB 的 LibreOffice 依赖，请耐心等待 2-5 分钟。
2. 转换带大量表格的 PDF 时，LibreOffice 会占用较多 CPU，属于正常现象。
