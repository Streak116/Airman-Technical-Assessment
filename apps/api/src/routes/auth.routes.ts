import { Router } from 'express';
import * as authController from '../controllers/auth.controller';

import { authLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/logout', authController.logout);

export default router;
