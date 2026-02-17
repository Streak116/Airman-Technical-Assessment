import { Router } from 'express';
import * as tenantController from '../controllers/tenant.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect); // All tenant routes are protected

router
    .route('/')
    .get(restrictTo('ADMIN'), tenantController.getAllTenants)
    .post(restrictTo('ADMIN'), tenantController.createTenant);

router
    .route('/:id/users')
    .get(restrictTo('ADMIN'), tenantController.getTenantUsers)
    .post(restrictTo('ADMIN'), tenantController.createTenantUser);

router.patch('/:id/users/:userId/password', restrictTo('ADMIN'), tenantController.updatePersonnelPassword);

router
    .route('/:id')
    .get(restrictTo('ADMIN'), tenantController.getTenant)
    .patch(restrictTo('ADMIN'), tenantController.updateTenant)
    .delete(restrictTo('ADMIN'), tenantController.deleteTenant);

export default router;
