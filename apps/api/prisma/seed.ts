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
        },
    });

    console.log('Seed successful!');
    console.log('Admin Username: ADMIN');
    console.log('Admin Password: admin123');
    console.log('Tenant ID:', tenant.id);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
