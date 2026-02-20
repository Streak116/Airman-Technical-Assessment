import express from 'express';
import * as userController from '../controllers/user.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = express.Router();

// All routes here are protected
router.use(protect);

// Admin-only and Tenant Admin/Instructor routes for student management
router.get('/pending-students', restrictTo('ADMIN', 'TENANT', 'INSTRUCTOR'), userController.getPendingStudents);

router.patch('/:userId/approve', restrictTo('ADMIN', 'TENANT'), userController.approveUser);
router.patch('/:userId/suspend', restrictTo('ADMIN', 'TENANT'), userController.suspendUser);

export default router;
