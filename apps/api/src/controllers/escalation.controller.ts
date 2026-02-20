import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import prisma from '../prisma';
import { AuditService } from '../services/audit.service';

export const getEscalations = catchAsync(async (req: Request, res: Response) => {
    const tenantId = req.user.tenantId;

    const escalations = await prisma.escalation.findMany({
        where: {
            tenantId,
            status: 'UNRESOLVED'
        },
        include: {
            booking: {
                include: {
                    student: { select: { id: true, username: true } }
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 20 // Limit to recent 20 for the UI dropdown
    });

    res.status(200).json({
        status: 'success',
        results: escalations.length,
        data: { escalations }
    });
});

export const dismissEscalation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const escalation = await prisma.escalation.findUnique({
        where: { id }
    });

    if (!escalation) return next(new AppError('Escalation not found', 404));
    if (escalation.tenantId !== tenantId) return next(new AppError('Not authorized', 403));

    const updated = await prisma.escalation.update({
        where: { id },
        data: { status: 'RESOLVED' }
    });

    AuditService.log({
        action: 'Escalation Dismissed',
        entity: 'Escalation',
        userId: req.user.id,
        tenantId,
        beforeState: escalation,
        afterState: updated,
        correlationId: req.correlationId
    });

    res.status(200).json({ status: 'success', data: { escalation: updated } });
});
