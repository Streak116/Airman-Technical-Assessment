import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // 1. Create Tenant
    const tenant = await prisma.tenant.upsert({
        where: { id: 'top-gun-tenant-id' },
        update: {},
        create: {
            id: 'top-gun-tenant-id',
            name: 'Top Gun Academy',
        },
    });

    // 2. Create Admin
    const admin = await prisma.user.upsert({
        where: { username: 'ADMIN' },
        update: {},
        create: {
            username: 'ADMIN',
            password: hashedPassword,
            role: 'ADMIN',
            tenantId: tenant.id,
            status: 'APPROVED',
        },
    });

    // 3. Create Instructor (Maverick)
    const instructor = await prisma.user.upsert({
        where: { username: 'MAVERICK' },
        update: {},
        create: {
            username: 'MAVERICK',
            password: hashedPassword,
            role: 'INSTRUCTOR',
            tenantId: tenant.id,
            status: 'APPROVED',
        },
    });

    // 4. Create Student (Rooster)
    const student = await prisma.user.upsert({
        where: { username: 'ROOSTER' },
        update: {},
        create: {
            username: 'ROOSTER',
            password: hashedPassword,
            role: 'STUDENT',
            tenantId: tenant.id,
            status: 'APPROVED',
        },
    });

    // 5. Create a Course (Created by Maverick)
    await prisma.course.upsert({
        where: { id: 'top-gun-ground-school' },
        update: {},
        create: {
            id: 'top-gun-ground-school',
            title: 'Top Gun Ground School',
            description: 'Advanced tactical training for elite naval aviators.',
            tenantId: tenant.id,
            instructorId: instructor.id,
            lastModifiedById: instructor.id,
        }
    });

    console.log('Seed successful! 🚀');
    console.log('------------------------------------------------');
    console.log('Tenant:   Top Gun Academy');
    console.log('Admin:    admin / admin123');
    console.log('Instruct: maverick / admin123');
    console.log('Student:  rooster / admin123');
    console.log('------------------------------------------------');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
