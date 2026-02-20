import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '../prisma';
import { AuditService } from '../services/audit.service';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');

const connection = {
    host: redisHost,
    port: redisPort,
};

export const escalationQueue = new Queue('booking-escalation', { connection });

// ─── Worker Setup ────────────────────────────────────────────────────────────

export const escalationWorker = new Worker('booking-escalation', async (job) => {
    const { bookingId, tenantId } = job.data;

    console.log(`[Job ${job.id}] Processing escalation check for Booking ${bookingId}...`);

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId }
    });

    if (!booking) {
        console.log(`[Job ${job.id}] Booking ${bookingId} no longer exists.`);
        return;
    }

    if (booking.status === 'REQUESTED' && !booking.instructorId) {
        // Condition matches: Still unassigned and requested. Trigger Escalation.
        console.log(`[Job ${job.id}] ⚠️ Booking ${bookingId} is still unassigned! Escalating to Tenant Admin.`);

        // 1. Create Escalation Record
        const escalation = await prisma.escalation.create({
            data: {
                bookingId,
                tenantId,
                message: `Booking requires immediate instructor assignment. Flight starts at ${booking.startTime.toISOString()}.`,
                status: 'UNRESOLVED'
            }
        });

        // 2. Audit Trail
        await AuditService.log({
            action: 'System Escalation Triggered',
            entity: 'Escalation',
            userId: 'SYSTEM',
            tenantId,
            afterState: escalation,
        });

        // 3. Email Notification Stub
        console.log(`------------------------------------------------------`);
        console.log(`[EMAIL STUB] To: Admin | Tenant: ${tenantId}`);
        console.log(`Subject: 🚨 ACTION REQUIRED: Unassigned Flight Escalation`);
        console.log(`Body: The flight booking ${bookingId} scheduled for ${booking.startTime.toISOString()} is still awaiting an instructor assignment.`);
        console.log(`------------------------------------------------------`);

    } else {
        console.log(`[Job ${job.id}] ✅ Booking ${bookingId} is already resolved or assigned (Status: ${booking.status}). No escalation needed.`);
    }

}, { connection });

escalationWorker.on('completed', (job) => {
    console.log(`[Job] Escalation job ${job.id} has completed!`);
});

escalationWorker.on('failed', (job, err) => {
    console.log(`[Job] Escalation job ${job?.id} has failed with ${err.message}`);
});
