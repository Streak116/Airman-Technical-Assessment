import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { AuditService } from '../services/audit.service';

/**
 * List all users with PENDING status for the current tenant.
 * Super Admins can see all pending users across the network.
 */
export const getPendingStudents = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user.tenantId;
    const role = req.user.role;

    const where: any = { status: 'PENDING', role: 'STUDENT' };

    // If not a global ADMIN, scope to the current tenant
    if (role !== 'ADMIN') {
        where.tenantId = tenantId;
    }

    const students = await prisma.user.findMany({
        where,
        select: {
            id: true,
            username: true,
            role: true,
            createdAt: true,
            tenant: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
        status: 'success',
        results: students.length,
        data: { students }
    });
});

/**
 * Approve a pending student.
 */
export const approveUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;
    const adminId = req.user.id;
    const tenantId = req.user.tenantId;
    const role = req.user.role;

    // 1. Find user and check authorization
    const userToApprove = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!userToApprove) {
        return next(new AppError('User not found', 404));
    }

    if (role !== 'ADMIN' && userToApprove.tenantId !== tenantId) {
        return next(new AppError('You are not authorized to approve users from another academy', 403));
    }

    // 2. Update status
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedById: adminId
        }
    });

    AuditService.log({
        action: 'User Approved',
        entity: 'User',
        userId: adminId,
        tenantId,
        beforeState: { status: userToApprove.status },
        afterState: { status: 'APPROVED' },
        correlationId: req.correlationId
    });

    res.status(200).json({
        status: 'success',
        data: { user: updatedUser }
    });
});

/**
 * Suspend a user.
 */
export const suspendUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;
    const tenantId = req.user.tenantId;
    const role = req.user.role;

    const userToSuspend = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!userToSuspend) {
        return next(new AppError('User not found', 404));
    }

    if (role !== 'ADMIN' && userToSuspend.tenantId !== tenantId) {
        return next(new AppError('Unauthorized', 403));
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' }
    });

    AuditService.log({
        action: 'User Suspended',
        entity: 'User',
        userId: req.user.id,
        tenantId,
        beforeState: { status: userToSuspend.status },
        afterState: { status: 'SUSPENDED' },
        correlationId: req.correlationId
    });

    res.status(200).json({
        status: 'success',
        data: { user: updatedUser }
    });
});
