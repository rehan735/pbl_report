import { Router } from 'express';
import { detectSign, getSignHistory, deleteSignDetection } from '../controllers/signController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/detect', authMiddleware, detectSign);
router.get('/history', authMiddleware, getSignHistory);
router.delete('/history/:id', authMiddleware, deleteSignDetection);

export default router;
