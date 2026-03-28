let selectedFile = null;
let selectedFormat = null;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const conversionOptions = document.getElementById('conversionOptions');
const convertBtn = document.getElementById('convertBtn');
const progressArea = document.getElementById('progressArea');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultArea = document.getElementById('resultArea');
const downloadLink = document.getElementById('downloadLink');
const errorArea = document.getElementById('errorArea');
const errorMessage = document.getElementById('errorMessage');

// dropZone click handled by HTML label/input association
// dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    if (file.type !== 'application/pdf') {
        showError('请选择PDF文件');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showError('文件大小不能超过10MB');
        return;
    }

    selectedFile = file;
    fileName.textContent = '📄 ' + file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    dropZone.classList.add('hidden');
    fileInfo.classList.remove('hidden');
    conversionOptions.classList.remove('hidden');
    
    selectedFormat = null;
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    convertBtn.disabled = true;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function selectFormat(format) {
    selectedFormat = format;
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.format === format) {
            btn.classList.add('selected');
        }
    });
    convertBtn.disabled = false;
}

async function startConversion() {
    if (!selectedFile || !selectedFormat) {
        showError('请选择文件和转换格�?);
        return;
    }

    conversionOptions.classList.add('hidden');
    progressArea.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = '准备上传文件...';

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('format', selectedFormat);

    try {
        progressFill.style.width = '20%';
        progressText.textContent = '正在上传文件...';

        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('转换服务出错');
        }

        progressFill.style.width = '60%';
        progressText.textContent = '正在转换文件...';

        const result = await response.json();

        if (result.success) {
            progressFill.style.width = '100%';
            progressText.textContent = '转换完成!';
            
            setTimeout(() => {
                progressArea.classList.add('hidden');
                resultArea.classList.remove('hidden');
                downloadLink.href = result.downloadUrl;
                downloadLink.download = result.filename;
            }, 500);
        } else {
            // 显示后端返回的具体错误信�?
            throw new Error(result.error || '转换失败');
        }
    } catch (error) {
        console.error('Conversion error:', error);
        showError(error.message || '转换过程中发生错�?);
    }
}

function showError(message) {
    progressArea.classList.add('hidden');
    conversionOptions.classList.add('hidden');
    errorArea.classList.remove('hidden');
    errorMessage.textContent = message;
}

function clearFile() {
    selectedFile = null;
    selectedFormat = null;
    fileInput.value = '';
    
    dropZone.classList.remove('hidden');
    fileInfo.classList.add('hidden');
    conversionOptions.classList.add('hidden');
    progressArea.classList.add('hidden');
    resultArea.classList.add('hidden');
    errorArea.classList.add('hidden');
}

function resetConverter() {
    clearFile();
}
