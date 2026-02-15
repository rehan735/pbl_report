import { Router } from 'express';
import { translateText } from '../controllers/translateController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public or protected route? Keeping it protected for now to match others, 
// but VoiceInput might be accessible without login? 
// Based on App.tsx, user must be logged in to see VoiceInput.
router.post('/', authMiddleware, translateText);

export default router;
