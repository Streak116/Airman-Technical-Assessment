import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

export const getAllTenants = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tenants = await prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
        status: 'success',
        results: tenants.length,
        data: {
            tenants
        }
    });
});

export const getTenant = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tenant = await prisma.tenant.findUnique({
        where: { id: req.params.id }
    });

    if (!tenant) {
        return next(new AppError('No tenant found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            tenant
        }
    });
});

export const createTenant = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, email, phone, address } = req.body;

    if (!name) {
        return next(new AppError('Please provide academy name', 400));
    }

    const tenant = await prisma.tenant.create({
        data: { name, description, email, phone, address }
    });

    res.status(201).json({
        status: 'success',
        data: {
            tenant
        }
    });
});

export const updateTenant = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tenant = await prisma.tenant.update({
        where: { id: req.params.id },
        data: req.body
    });

    if (!tenant) {
        return next(new AppError('No tenant found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            tenant
        }
    });
});

export const deleteTenant = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tenant = await prisma.tenant.delete({
        where: { id: req.params.id }
    });

    if (!tenant) {
        return next(new AppError('No tenant found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});

export const getTenantUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const pageNum = parseInt(req.query.page as string || '1', 10);
    const limitNum = parseInt(req.query.limit as string || '10', 10);
    const skip = (pageNum - 1) * limitNum;
    const where = {
        tenantId: req.params.id,
        role: 'TENANT' as any
    };

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true
            },
            skip,
            take: limitNum
        }),
        prisma.user.count({ where })
    ]);

    res.status(200).json({
        status: 'success',
        results: users.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: { users }
    });
});

export const createTenantUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { username, password } = req.body;
    const tenantId = req.params.id;

    if (!username || !password) {
        return next(new AppError('Please provide username and password', 400));
    }

    // 1. Decrypt (if arriving encrypted, though usually handled in middleware or explicitly here for consistency with Auth)
    const { decryptData } = require('../utils/crypto');
    const decryptedUsername = decryptData(username).toUpperCase();
    const decryptedPassword = decryptData(password);

    // 2. Check for duplicate username
    const existingUser = await prisma.user.findFirst({
        where: { username: decryptedUsername }
    });

    if (existingUser) {
        return next(new AppError('This callsign is already registered in the Airman network', 400));
    }

    // 3. Hash
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(decryptedPassword, 12);

    // 4. Create
    const user = await prisma.user.create({
        data: {
            username: decryptedUsername,
            password: hashedPassword,
            role: 'TENANT' as any,
            tenantId,
            status: 'APPROVED'
        }
    });

    (user as any).password = undefined;

    res.status(201).json({
        status: 'success',
        data: {
            user
        }
    });
});

export const updatePersonnelPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { newPassword } = req.body;
    const { id: tenantId, userId } = req.params;

    if (!newPassword) {
        return next(new AppError('Please provide a new password', 400));
    }

    // 1. Verify user exists and belongs to this tenant
    const user = await prisma.user.findFirst({
        where: {
            id: userId,
            tenantId: tenantId,
            role: 'TENANT'
        }
    });

    if (!user) {
        return next(new AppError('Personnel not found or unauthorized', 404));
    }

    // 2. Decrypt and Hash
    const { decryptData } = require('../utils/crypto');
    const decryptedPassword = decryptData(newPassword);

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(decryptedPassword, 12);

    // 3. Update
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    });

    res.status(200).json({
        status: 'success',
        message: 'Personnel password updated successfully'
    });
});

// ─── Tenant-scoped Instructor Management ────────────────────────────────────

export const getMyInstructors = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user.tenantId;

    const pageNum = parseInt(req.query.page as string || '1', 10);
    const limitNum = parseInt(req.query.limit as string || '10', 10);
    const skip = (pageNum - 1) * limitNum;
    const where = {
        tenantId,
        role: 'INSTRUCTOR' as any
    };

    const [instructors, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true
            },
            skip,
            take: limitNum
        }),
        prisma.user.count({ where })
    ]);

    res.status(200).json({
        status: 'success',
        results: instructors.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: { instructors }
    });
});

export const createInstructor = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { username, password } = req.body;
    const tenantId = req.user.tenantId;

    if (!username || !password) {
        return next(new AppError('Please provide username and password', 400));
    }

    const { decryptData } = require('../utils/crypto');
    const decryptedUsername = decryptData(username).toUpperCase();
    const decryptedPassword = decryptData(password);

    // Check for duplicate username
    const existingUser = await prisma.user.findFirst({
        where: { username: decryptedUsername }
    });

    if (existingUser) {
        return next(new AppError('This callsign is already registered in the Airman network', 400));
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(decryptedPassword, 12);

    const instructor = await prisma.user.create({
        data: {
            username: decryptedUsername,
            password: hashedPassword,
            role: 'INSTRUCTOR' as any,
            tenantId,
            status: 'APPROVED'
        }
    });

    (instructor as any).password = undefined;

    res.status(201).json({
        status: 'success',
        data: { instructor }
    });
});

export const updateInstructorPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { newPassword } = req.body;
    const { userId } = req.params;
    const tenantId = req.user.tenantId;

    if (!newPassword) {
        return next(new AppError('Please provide a new password', 400));
    }

    const instructor = await prisma.user.findFirst({
        where: { id: userId, tenantId, role: 'INSTRUCTOR' as any }
    });

    if (!instructor) {
        return next(new AppError('Instructor not found or unauthorized', 404));
    }

    const { decryptData } = require('../utils/crypto');
    const decryptedPassword = decryptData(newPassword);

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(decryptedPassword, 12);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    });

    res.status(200).json({
        status: 'success',
        message: 'Instructor access key updated successfully'
    });
});

export const getInstructors = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.params.id;

    const pageNum = parseInt(req.query.page as string || '1', 10);
    const limitNum = parseInt(req.query.limit as string || '10', 10);
    const skip = (pageNum - 1) * limitNum;
    const where = {
        tenantId,
        role: 'INSTRUCTOR' as any
    };

    const [instructors, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true
            },
            skip,
            take: limitNum
        }),
        prisma.user.count({ where })
    ]);

    res.status(200).json({
        status: 'success',
        results: instructors.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: { instructors }
    });
});
