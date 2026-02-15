import { Router } from 'express';
import { saveTranscript, getVoiceHistory, deleteVoiceTranscript } from '../controllers/voiceController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/transcribe', authMiddleware, saveTranscript);
router.get('/history', authMiddleware, getVoiceHistory);
router.delete('/history/:id', authMiddleware, deleteVoiceTranscript);

export default router;
