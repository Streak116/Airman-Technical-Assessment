import { Request, Response, NextFunction } from 'express';
import { createBooking } from './booking.controller';
import { prismaMock } from '../test/setup';
import { AppError } from '../utils/appError';

jest.mock('../jobs/queue', () => ({
    escalationQueue: {
        add: jest.fn().mockResolvedValue({})
    }
}));

describe('Booking Controller', () => {
    let mockReq: Partial<Request> & { user?: any };
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock<NextFunction>;

    beforeEach(() => {
        mockReq = {
            body: {},
            user: { id: 'student-1', tenantId: 'tenant-1', role: 'STUDENT' }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createBooking', () => {
        it('should return 400 if start time is after end time', async () => {
            const now = new Date();
            mockReq.body = {
                startTime: new Date(now.getTime() + 80 * 60 * 60 * 1000).toISOString(),
                endTime: new Date(now.getTime() + 75 * 60 * 60 * 1000).toISOString()
            };

            await createBooking(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
            expect(mockNext.mock.calls[0][0].message).toBe('Start time must be before end time');
        });

        it('should return 400 if booking is in the past', async () => {
            const now = new Date();
            mockReq.body = {
                startTime: new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString(),
                endTime: new Date(now.getTime() - 9 * 60 * 60 * 1000).toISOString()
            };

            await createBooking(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
            expect(mockNext.mock.calls[0][0].message).toBe('Cannot book in the past');
        });

        it('should return 400 if booking is not 72 hours in advance', async () => {
            const now = new Date();
            mockReq.body = {
                startTime: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
                endTime: new Date(now.getTime() + 50 * 60 * 60 * 1000).toISOString()
            };

            await createBooking(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
            expect(mockNext.mock.calls[0][0].message).toBe('Bookings must be made at least 72 hours in advance');
        });

        it('should return 409 if there is an instructor conflict', async () => {
            const now = new Date();
            mockReq.body = {
                startTime: new Date(now.getTime() + 80 * 60 * 60 * 1000).toISOString(),
                endTime: new Date(now.getTime() + 82 * 60 * 60 * 1000).toISOString(),
                instructorId: 'inst-1'
            };

            // Mock instructor conflict
            prismaMock.booking.findFirst.mockResolvedValueOnce({ id: 'conflicting-booking-1' } as any);

            await createBooking(mockReq as Request, mockRes as Response, mockNext);

            expect(prismaMock.booking.findFirst).toHaveBeenCalledTimes(1);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            expect(mockNext.mock.calls[0][0].statusCode).toBe(409);
            expect(mockNext.mock.calls[0][0].message).toBe('Instructor is not available at this time');
        });

        it('should return 409 if there is a student conflict', async () => {
            const now = new Date();
            mockReq.body = {
                startTime: new Date(now.getTime() + 80 * 60 * 60 * 1000).toISOString(),
                endTime: new Date(now.getTime() + 82 * 60 * 60 * 1000).toISOString()
            };

            // Mock student conflict
            prismaMock.booking.findFirst.mockResolvedValueOnce({ id: 'conflicting-booking-2' } as any);

            await createBooking(mockReq as Request, mockRes as Response, mockNext);

            expect(prismaMock.booking.findFirst).toHaveBeenCalledTimes(1);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            expect(mockNext.mock.calls[0][0].statusCode).toBe(409);
            expect(mockNext.mock.calls[0][0].message).toBe('You already have a booking at this time');
        });

        it('should create booking successfully when no conflicts', async () => {
            const now = new Date();
            mockReq.body = {
                startTime: new Date(now.getTime() + 80 * 60 * 60 * 1000).toISOString(),
                endTime: new Date(now.getTime() + 82 * 60 * 60 * 1000).toISOString(),
                instructorId: 'inst-1'
            };

            // No conflicts
            prismaMock.booking.findFirst.mockResolvedValue(null);

            const mockCreatedBooking = { id: 'new-booking-1', status: 'REQUESTED' };
            prismaMock.booking.create.mockResolvedValue(mockCreatedBooking as any);

            await createBooking(mockReq as Request, mockRes as Response, mockNext);

            expect(prismaMock.booking.findFirst).toHaveBeenCalledTimes(2); // One for instructor, one for student
            expect(prismaMock.booking.create).toHaveBeenCalledTimes(1);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                data: { booking: mockCreatedBooking }
            }));
        });
    });
});
