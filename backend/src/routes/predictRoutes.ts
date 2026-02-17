import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { config } from "../config/env";

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
        fs.appendFileSync(path.join(process.cwd(), 'debug_log.txt'), `[${new Date().toISOString()}] Request received. File: ${imagePath}\n`);
    } catch (e) { console.error(e); }

    try {
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));

        const pythonUrl = config.pythonServiceUrl;
        const response = await axios.post(`${pythonUrl}/predict`, formData, {
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
            console.error('Prediction Service Response Error Status:', error.response.status);
            console.error('Prediction Service Response Error Data:', error.response.data);
            res.status(error.response.status).json({
                error: "Prediction service returned an error",
                details: error.response.data
            });
        } else {
            console.error('Prediction Service Network/Internal Error:', error.message);
            res.status(500).json({ error: "Prediction service is unreachable or internal error occurred" });
        }
    } finally {
        // Clean up uploaded file
        try {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        } catch (cleanupError) {
            console.error('Failed to cleanup uploaded file:', cleanupError);
        }
    }
});

export default router;
