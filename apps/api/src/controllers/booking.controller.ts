import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import prisma from '../prisma';
import { AuditService } from '../services/audit.service';

// ─── Booking CRUD ────────────────────────────────────────────────────────────

// Create a booking request (Student)
export const createBooking = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { startTime, endTime, instructorId } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
        return next(new AppError('Start time must be before end time', 400));
    }

    const now = new Date();

    if (start < now) {
        return next(new AppError('Cannot book in the past', 400));
    }

    const minLeadTime = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours from now

    if (start < minLeadTime) {
        return next(new AppError('Bookings must be made at least 72 hours in advance', 400));
    }

    // Conflict Detection: Check if instructor is available (if specified)
    if (instructorId) {
        const instructorConflict = await prisma.booking.findFirst({
            where: {
                instructorId,
                status: { not: 'CANCELLED' },
                OR: [
                    { startTime: { lt: end }, endTime: { gt: start } }
                ]
            }
        });

        if (instructorConflict) {
            return next(new AppError('Instructor is not available at this time', 409));
        }
    }

    // Conflict Detection: Check if student is already booked
    const studentConflict = await prisma.booking.findFirst({
        where: {
            studentId: userId,
            status: { not: 'CANCELLED' },
            OR: [
                { startTime: { lt: end }, endTime: { gt: start } }
            ]
        }
    });

    if (studentConflict) {
        return next(new AppError('You already have a booking at this time', 409));
    }

    const booking = await prisma.booking.create({
        data: {
            studentId: userId,
            instructorId, // Optional at this stage
            tenantId,
            startTime: start,
            endTime: end,
            status: 'REQUESTED'
        },
        include: {
            student: { select: { id: true, username: true } },
            instructor: { select: { id: true, username: true } }
        }
    });

    AuditService.log({
        action: 'Schedule Created',
        entity: 'Booking',
        userId: req.user.id,
        tenantId,
        afterState: booking,
        correlationId: req.correlationId
    });

    res.status(201).json({ status: 'success', data: { booking } });
});

// Get all bookings (Filtered by Tenant)
export const getAllBookings = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user.tenantId;
    const { start, end, userId } = req.query;

    const whereClause: any = { tenantId };

    // Range filtering
    if (start && end) {
        whereClause.startTime = { gte: new Date(start as string) };
        whereClause.endTime = { lte: new Date(end as string) };
    }

    // Role-based filtering
    if (req.user.role === 'STUDENT') {
        whereClause.studentId = req.user.id;
    } else if (req.user.role === 'INSTRUCTOR') {
        // Instructors see their own bookings OR all unassigned requests? 
        // For simple skynet-lite, let instructors see whole schedule or just theirs. 
        // Let's restricting to theirs for now, or maybe they need to see availability?
        // Let's allow instructors to see ALL so they can see availability, effectively same as Tenant for viewing.
    }

    // Explicit User Filter (for Admin/Tenant to filter by specific person)
    if (userId) {
        whereClause.OR = [
            { studentId: userId as string },
            { instructorId: userId as string }
        ];
    }

    const bookings = await prisma.booking.findMany({
        where: whereClause,
        include: {
            student: { select: { id: true, username: true } },
            instructor: { select: { id: true, username: true } }
        },
        orderBy: { startTime: 'asc' }
    });

    res.status(200).json({ status: 'success', results: bookings.length, data: { bookings } });
});

// Update Booking (Approve/Assign/Cancel) - Tenant Only (mostly)
export const updateBooking = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status, instructorId, cancellationReason } = req.body;

    // Check if booking exists and belongs to tenant
    const booking = await prisma.booking.findUnique({
        where: { id },
        include: { student: true }
    });

    if (!booking) return next(new AppError('Booking not found', 404));
    if (booking.tenantId !== req.user.tenantId) return next(new AppError('Not authorized', 403));

    // Role checks
    if (req.user.role === 'STUDENT') {
        // Students can only CANCEL their own bookings
        if (booking.studentId !== req.user.id) return next(new AppError('Not authorized', 403));
        if (status !== 'CANCELLED') return next(new AppError('Students can only cancel bookings', 403));
    }

    // Instructor conflict check if being assigned
    if (instructorId && instructorId !== booking.instructorId) {
        const start = booking.startTime;
        const end = booking.endTime;

        const conflict = await prisma.booking.findFirst({
            where: {
                instructorId,
                status: { not: 'CANCELLED' },
                id: { not: id }, // Exclude self
                OR: [
                    { startTime: { lt: end }, endTime: { gt: start } }
                ]
            }
        });

        if (conflict) {
            return next(new AppError('Instructor is already booked at this time', 409));
        }
    }

    const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
            status,
            instructorId,
            cancellationReason
        },
        include: {
            student: { select: { id: true, username: true } },
            instructor: { select: { id: true, username: true } }
        }
    });

    AuditService.log({
        action: 'Schedule Updated',
        entity: 'Booking',
        userId: req.user.id,
        tenantId: req.user.tenantId,
        beforeState: booking,
        afterState: updatedBooking,
        correlationId: req.correlationId
    });

    res.status(200).json({ status: 'success', data: { booking: updatedBooking } });
});
