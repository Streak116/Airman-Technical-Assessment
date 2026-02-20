import request from 'supertest';
import app from '../../server';
import prisma from '../../prisma';
import jwt from 'jsonwebtoken';
import * as cryptoUtils from '../../utils/crypto';

describe('Booking Integration Flow', () => {
    let studentToken: string;
    let instructorId: string;
    let tenantId: string;

    beforeAll(async () => {
        // Clean up
        await prisma.booking.deleteMany({ where: { student: { username: { startsWith: 'INT_BOOK_' } } } });
        await prisma.user.deleteMany({ where: { username: { startsWith: 'INT_BOOK_' } } });
        await prisma.tenant.deleteMany({ where: { name: 'INT_BOOK_TENANT' } });

        // Setup Tenant & Users for testing booking
        const tenant = await prisma.tenant.create({ data: { name: 'INT_BOOK_TENANT' } });
        tenantId = tenant.id;

        const instructor = await prisma.user.create({
            data: {
                username: 'INT_BOOK_INST',
                password: 'hashedpassword',
                role: 'INSTRUCTOR',
                tenantId,
                status: 'APPROVED'
            }
        });
        instructorId = instructor.id;

        const student = await prisma.user.create({
            data: {
                username: 'INT_BOOK_STUDENT',
                password: 'hashedpassword',
                role: 'STUDENT',
                tenantId,
                status: 'APPROVED'
            }
        });

        studentToken = jwt.sign({ id: student.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    });

    afterAll(async () => {
        await prisma.booking.deleteMany({ where: { student: { username: { startsWith: 'INT_BOOK_' } } } });
        await prisma.user.deleteMany({ where: { username: { startsWith: 'INT_BOOK_' } } });
        await prisma.tenant.deleteMany({ where: { name: 'INT_BOOK_TENANT' } });
        await prisma.$disconnect();
    });

    it('should create a booking successfully and reject overlapping bookings', async () => {
        // 1. Create a valid booking 72 hours from now
        const now = new Date();
        const start1 = new Date(now.getTime() + 80 * 60 * 60 * 1000); // 80 hours out
        const end1 = new Date(now.getTime() + 82 * 60 * 60 * 1000);

        const createRes = await request(app)
            .post('/api/v1/bookings')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                startTime: start1.toISOString(),
                endTime: end1.toISOString(),
                instructorId
            });

        expect(createRes.status).toBe(201);
        expect(createRes.body.status).toBe('success');
        expect(createRes.body.data.booking.id).toBeDefined();

        // Verify in Real DB
        const dbBooking = await prisma.booking.findUnique({
            where: { id: createRes.body.data.booking.id }
        });
        expect(dbBooking).toBeTruthy();
        expect(dbBooking?.instructorId).toBe(instructorId);

        // 2. Attempt to create overlapping booking (Student Conflict)
        const overlapRes = await request(app)
            .post('/api/v1/bookings')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                startTime: new Date(now.getTime() + 81 * 60 * 60 * 1000).toISOString(), // Overlaps exactly
                endTime: new Date(now.getTime() + 83 * 60 * 60 * 1000).toISOString(),
                instructorId
            });

        expect(overlapRes.status).toBe(409);
        expect(overlapRes.body.message).toBe('Instructor is not available at this time'); // Hits instructor conflict first if instructor provided
    });
});
