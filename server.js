require('dotenv').config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const { Dropbox } = require("dropbox");
const fs = require("fs");
const cors = require("cors");

const app = express();
const port = 3000;

const ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;
const dbx = new Dropbox({ accessToken: ACCESS_TOKEN });

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: 'http://localhost:5500',
  methods: ['GET', 'POST'],
}));

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const upload = multer({
    dest: "uploads/",
    limits: { fileSize: 10 * 1024 * 1024 },
});

app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }
    const filePath = req.file.path;
    const dropboxPath = `/${req.file.originalname}`;
    try {
        const fileContent = fs.readFileSync(filePath);
        await dbx.filesUpload({ path: dropboxPath, contents: fileContent });
        fs.unlinkSync(filePath);
        res.send("File uploaded successfully to Dropbox.");
    } catch (error) {
        console.error("Error uploading file to Dropbox:", error);
        res.status(500).send("Failed to upload file.");
    }
});

app.get("/download", async (req, res) => {
    const fileName = req.query.fileName; 
    const dropboxPath = `/${fileName}`;
    try {
        const downloadResponse = await dbx.filesDownload({ path: dropboxPath });
        const fileMetadata = downloadResponse.result;
        const fileContent = fileMetadata.fileBinary; 
        if (!fileContent) {
            return res.status(500).send("Failed to retrieve file content from Dropbox.");
        }
        res.setHeader("Content-Disposition", `attachment; filename="${fileMetadata.name}"`);
        res.setHeader("Content-Type", "application/octet-stream");
        res.end(Buffer.from(fileContent), "binary");
    } catch (error) {
        console.error("Error downloading file from Dropbox:", error);
        res.status(500).send("Failed to download file.");
    }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
