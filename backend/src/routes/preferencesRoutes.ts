import { Router } from 'express';
import { getPreferences, updatePreferences } from '../controllers/preferencesController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getPreferences);
router.put('/', authMiddleware, updatePreferences);

export default router;
