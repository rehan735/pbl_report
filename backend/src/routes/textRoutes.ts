import { Router } from 'express';
import { saveMessage, getMessages, deleteMessage } from '../controllers/textController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/messages', authMiddleware, saveMessage);
router.get('/messages', authMiddleware, getMessages);
router.delete('/messages/:id', authMiddleware, deleteMessage);

export default router;
