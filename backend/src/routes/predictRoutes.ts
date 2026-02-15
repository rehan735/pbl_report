import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("image"), async (req, res): Promise<void> => {
    if (!req.file) {
        res.status(400).json({ error: "No image uploaded" });
        return;
    }

    const imagePath = req.file.path;

    // DEBUG: Log request
    try {
        const fs = require('fs');
        const path = require('path');
        fs.appendFileSync(path.join(process.cwd(), 'debug_log.txt'), `[${new Date().toISOString()}] Request received. File: ${imagePath}\n`);
    } catch (e) { console.error(e); }

    try {
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));

        const response = await axios.post('http://localhost:5001/predict', formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        // DEBUG: Log success
        try {
            fs.appendFileSync(path.join(process.cwd(), 'debug_log.txt'), `[${new Date().toISOString()}] Success: ${response.data.prediction}|${response.data.confidence}\n`);
        } catch (e) { console.error(e); }

        res.json(response.data);

    } catch (error: any) {
        console.error('Prediction Service Error:', error.message);
        // DEBUG: Log error
        try {
            fs.appendFileSync(path.join(process.cwd(), 'debug_log.txt'), `[${new Date().toISOString()}] Service Error: ${error.message}\n`);
        } catch (e) { console.error(e); }

        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        res.status(500).json({ error: "Prediction service failed" });
    }
});

export default router;
