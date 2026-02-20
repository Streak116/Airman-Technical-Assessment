import express from 'express';
import { getEscalations, dismissEscalation } from '../controllers/escalation.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);
router.use(restrictTo('ADMIN', 'TENANT'));

router.get('/', getEscalations);
router.patch('/:id/resolve', dismissEscalation);

export default router;
