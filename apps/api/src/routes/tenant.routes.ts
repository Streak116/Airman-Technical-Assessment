import { Router } from 'express';
import * as tenantController from '../controllers/tenant.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

// Public: Fetch academy list for registration
router.get('/', tenantController.getAllTenants);

router.use(protect);

router
    .route('/')
    .post(restrictTo('ADMIN'), tenantController.createTenant);

// Admin: manage personnel (TENANT-role users) for a specific academy
router
    .route('/:id/users')
    .get(restrictTo('ADMIN'), tenantController.getTenantUsers)
    .post(restrictTo('ADMIN'), tenantController.createTenantUser);

router.patch('/:id/users/:userId/password', restrictTo('ADMIN'), tenantController.updatePersonnelPassword);

// Tenant: manage instructors within their own academy (tenantId from JWT)
router
    .route('/my/instructors')
    .get(restrictTo('TENANT'), tenantController.getMyInstructors)
    .post(restrictTo('TENANT'), tenantController.createInstructor);

router.patch('/my/instructors/:userId/password', restrictTo('TENANT'), tenantController.updateInstructorPassword);

router
    .route('/:id')
    .get(restrictTo('ADMIN'), tenantController.getTenant)
    .patch(restrictTo('ADMIN'), tenantController.updateTenant)
    .delete(restrictTo('ADMIN'), tenantController.deleteTenant);

// Public/Protected: Get instructors for a specific academy (for booking dropdowns)
router.get('/:id/instructors', tenantController.getInstructors);

export default router;
