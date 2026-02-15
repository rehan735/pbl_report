import { Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../utils/logger';

export const translateText = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.body) {
            res.status(400).json({
                success: false,
                message: 'Request body is missing',
            });
            return;
        }
        const { text, sourceLang, targetLang } = req.body;

        if (!text || !targetLang) {
            res.status(400).json({
                success: false,
                message: 'Text and target language are required',
            });
            return;
        }

        // Use MyMemory API (free tier)
        const langPair = `${sourceLang || 'en'}|${targetLang}`;
        const response = await axios.get('https://api.mymemory.translated.net/get', {
            params: {
                q: text,
                langpair: langPair,
            },
        });

        if (response.data && response.data.responseData) {
            res.status(200).json({
                success: true,
                translatedText: response.data.responseData.translatedText,
                match: response.data.responseData.match,
            });
        } else {
            throw new Error('Invalid response from translation API');
        }

    } catch (error) {
        logger.error('Translation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to translate text',
        });
    }
};
