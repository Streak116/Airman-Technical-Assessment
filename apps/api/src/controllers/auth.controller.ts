import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { z } from 'zod';
import { decryptData } from '../utils/crypto';
import { AuditService } from '../services/audit.service';

const signToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any,
    });
};

const createSendToken = (user: any, statusCode: number, res: Response) => {
    const token = signToken(user.id);

    const cookieOptions = {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    };

    res.cookie('jwt', token, cookieOptions);

    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user,
        },
    });
};

export const register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 0. Decrypt Data
    req.body.username = decryptData(req.body.username);
    req.body.password = decryptData(req.body.password);

    const schema = z.object({
        username: z.string().min(3),
        password: z.string().min(8),
        role: z.enum(['ADMIN', 'TENANT', 'INSTRUCTOR', 'STUDENT']),
        tenantName: z.string().min(2).optional(),
        tenantId: z.string().optional(),
    });

    const validatedData = schema.parse(req.body);
    let targetTenantId = validatedData.tenantId;

    // 1. Handle Tenant (Create or Join)
    if (!targetTenantId) {
        if (!validatedData.tenantName) {
            return next(new AppError('Please provide either an academy name to create or an academy ID to join', 400));
        }
        const tenant = await prisma.tenant.create({
            data: { name: validatedData.tenantName as string }
        });
        targetTenantId = tenant.id;
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // 3. Create User
    const newUser = await prisma.user.create({
        data: {
            username: validatedData.username.toUpperCase(),
            password: hashedPassword,
            role: validatedData.role as any,
            tenantId: targetTenantId,
            status: validatedData.role === 'STUDENT' ? 'PENDING' : 'APPROVED',
        },
    });

    createSendToken(newUser, 201, res);
});

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    let { username, password } = req.body;

    // 0. Decrypt Data
    username = decryptData(username);
    password = decryptData(password);

    // 1. Check if username and password exist
    if (!username || !password) {
        return next(new AppError('Please provide username and password', 400));
    }

    // 2. Check if user exists && password is correct
    const user = await prisma.user.findUnique({
        where: { username: username.toUpperCase() },
        include: { tenant: { select: { id: true, name: true } } },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return next(new AppError('Incorrect username or password', 401));
    }

    // 3. Check user status
    if (user.status === 'PENDING') {
        return next(new AppError('Your account is pending approval by an administrator', 403));
    }
    if (user.status === 'SUSPENDED') {
        return next(new AppError('Your account has been suspended', 403));
    }

    // 4. If everything ok, send token to client
    createSendToken(user, 200, res);

    AuditService.log({
        action: 'User login',
        entity: 'User',
        userId: user.id,
        tenantId: user.tenantId,
        correlationId: req.correlationId
    });
});

export const logout = (req: Request, res: Response) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({ status: 'success' });
};
