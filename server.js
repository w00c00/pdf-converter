const express = require("express");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3456;
const API_KEY = process.env.CLOUDCONVERT_API_KEY || "";
const UPLOAD_DIR = path.join(__dirname, "uploads");
const OUTPUT_DIR = path.join(__dirname, "outputs");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, uuidv4() + "-" + file.originalname)
});

app.post("/api/convert", multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }).single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: "No file" });
        const format = req.body.format;
        console.log("Converting to:", format);
        
        if (!["docx", "jpg"].includes(format)) {
            return res.status(400).json({ success: false, error: "Invalid format" });
        }
        
        if (!API_KEY) {
            const result = await mockConversion(req.file, format);
            return res.json(result);
        }
        
        const result = await convertWithCloudConvert(req.file, format, API_KEY);
        res.json(result);
    } catch (e) {
        console.error("Conversion error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

async function convertWithCloudConvert(file, format, apiKey) {
    const oFormat = format === "jpg" ? "jpg" : "docx";
    
    console.log("Creating CloudConvert job...");
    
    try {
        // Step 1: Create job
        const j = await axios.post("https://api.cloudconvert.com/v2/jobs", {
            tasks: {
                "upload-file": { operation: "import/upload" },
                "convert-file": { operation: "convert", input: "upload-file", output_format: oFormat },
                "export-file": { operation: "export/url", input: "convert-file" }
            }
        }, {
            headers: {
                "Authorization": "Bearer " + apiKey,
                "Content-Type": "application/json"
            }
        });
        
        console.log("Job created:", j.data.data);
        
        const job = j.data.data;
        const uploadTask = job.tasks.find(t => t.name === "upload-file");
        
        if (!uploadTask || !uploadTask.result || !uploadTask.result.form) {
            throw new Error("Failed to get upload URL");
        }
        
        console.log("Uploading file...");
        
        // Step 2: Upload file
        await axios.put(uploadTask.result.form.url, fs.createReadStream(file.path), {
            headers: {
                "Content-Type": "application/pdf"
            }
        });
        
        console.log("File uploaded, waiting for conversion...");
        
        // Step 3: Wait for conversion
        let status = job.status;
        let attempts = 0;
        
        while ((status === "pending" || status === "processing") && attempts < 60) {
            await new Promise(r => setTimeout(r, 2000));
            const s = await axios.get("https://api.cloudconvert.com/v2/jobs/" + job.id, {
                headers: {
                    "Authorization": "Bearer " + apiKey
                }
            });
            status = s.data.data.status;
            attempts++;
            console.log("Status:", status, "Attempt:", attempts);
        }
        
        console.log("Final status:", status);
        
        if (status === "finished") {
            const et = job.tasks.find(t => t.name === "export-file");
            const dl = et.result.files[0].url;
            const fn = et.result.files[0].filename;
            const ofn = uuidv4() + "-" + fn;
            const op = path.join(OUTPUT_DIR, ofn);
            
            console.log("Downloading from:", dl);
            
            const fileResponse = await axios.get(dl, { responseType: "arraybuffer" });
            fs.writeFileSync(op, fileResponse.data);
            fs.unlinkSync(file.path);
            
            return { success: true, downloadUrl: "/download/" + ofn, filename: fn };
        }
        
        throw new Error("Conversion failed with status: " + status);
        
    } catch (e) {
        console.error("CloudConvert error:", e.response ? e.response.data : e.message);
        throw e;
    }
}

async function mockConversion(file, format) {
    await new Promise(r => setTimeout(r, 2000));
    const e = format === "jpg" ? "jpg" : "docx";
    const ofn = uuidv4() + ".converted." + e;
    const op = path.join(OUTPUT_DIR, ofn);
    fs.writeFileSync(op, Buffer.from("Mock conversion - configure API_KEY for real conversion"));
    fs.unlinkSync(file.path);
    return { success: true, downloadUrl: "/download/" + ofn, filename: ofn };
}

app.get("/download/:filename", (req, res) => {
    const fp = path.join(OUTPUT_DIR, req.params.filename);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: "Not found" });
    res.download(fp);
});

app.listen(PORT, () => {
    console.log("===========================================");
    console.log("PDF Converter running on port " + PORT);
    console.log("API Key:", API_KEY ? "Configured" : "Mock mode");
    console.log("===========================================");
});
