const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { randomUUID: uuidv4 } = require('crypto');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3456;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const OUTPUT_DIR = path.join(__dirname, 'outputs');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const upload = multer({ dest: UPLOAD_DIR });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/convert', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) throw new Error('未接收到文件');
        const format = req.body.format;
        console.log(`[Request] ${req.file.originalname} -> ${format}`);

        let result;
        if (format === 'jpg' || format === 'png') {
            result = await convertPdfToImage(req.file, format);
        } else if (format === 'docx') {
            result = await convertPdfToDocx(req.file);
        } else {
            result = { success: false, error: '不支持的格式' };
        }
        res.json(result);
    } catch (error) {
        console.error('[Global Error]', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

async function convertPdfToImage(file, format) {
    const outputFilename = `${uuidv4()}-converted.${format}`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    const cmd = `convert -density 150 "${file.path}" -background white -alpha remove -alpha off -append -quality 85 "${outputPath}"`;
    try {
        execSync(cmd, { stdio: 'inherit' });
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return { success: true, downloadUrl: `/download/${outputFilename}`, filename: `${path.parse(file.originalname).name}.${format}` };
    } catch (e) {
        throw new Error(`图片引擎报错: ${e.message}`);
    }
}

async function convertPdfToDocx(file) {
    const userProfile = `/tmp/lo_profile_${uuidv4()}`;
    // 关键修复：将输入文件重命名为简单名称，避免特殊字符干扰 LibreOffice
    const safeInputName = path.join(UPLOAD_DIR, `${uuidv4()}.pdf`);
    fs.renameSync(file.path, safeInputName);

    try {
        console.log(`[LibreOffice] Converting ${file.originalname}...`);
        // 强制过滤器：--infilter="writer_pdf_import"
        const cmd = `DBUS_SESSION_BUS_ADDRESS=/dev/null soffice "-env:UserInstallation=file://${userProfile}" --headless --convert-to docx --infilter="writer_pdf_import" --outdir "${OUTPUT_DIR}" "${safeInputName}"`;
        
        execSync(cmd, { timeout: 120000, stdio: 'inherit' });

        const baseName = path.parse(safeInputName).name;
        const generatedPath = path.join(OUTPUT_DIR, `${baseName}.docx`);

        if (fs.existsSync(generatedPath)) {
            const finalFilename = `${uuidv4()}-converted.docx`;
            const finalPath = path.join(OUTPUT_DIR, finalFilename);
            fs.renameSync(generatedPath, finalPath);
            if (fs.existsSync(safeInputName)) fs.unlinkSync(safeInputName);
            return { success: true, downloadUrl: `/download/${finalFilename}`, filename: `${path.parse(file.originalname).name}.docx` };
        } else {
            throw new Error('LibreOffice 执行完毕但未生成文件，请尝试转为图片预览');
        }
    } catch (e) {
        console.error('[LibreOffice Failed]', e.message);
        if (fs.existsSync(safeInputName)) fs.unlinkSync(safeInputName);
        throw new Error(`Word 引擎异常: ${e.message}`);
    } finally {
        try { execSync(`rm -rf ${userProfile}`); } catch(e) {}
    }
}

app.get('/download/:filename', (req, res) => {
    const filePath = path.join(OUTPUT_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('文件不存�?);
    res.download(filePath);
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`🚀 PDF Pro running on port ${PORT}`));
