import request from 'supertest';
import app from '../../server'; // Make sure app is exported without calling app.listen directly if we import it, or we can use the running test container URL if it's running
import prisma from '../../prisma';
import * as cryptoUtils from '../../utils/crypto';

describe('Auth Integration Flow', () => {
    beforeAll(async () => {
        // Clean up any previous test data
        await prisma.auditLog.deleteMany({ where: { tenant: { name: 'INT_TEST_TENANT' } } });
        await prisma.user.deleteMany({ where: { username: { startsWith: 'INT_TEST_' } } });
        await prisma.tenant.deleteMany({ where: { name: 'INT_TEST_TENANT' } });
    });

    afterAll(async () => {
        await prisma.auditLog.deleteMany({ where: { tenant: { name: 'INT_TEST_TENANT' } } });
        await prisma.user.deleteMany({ where: { username: { startsWith: 'INT_TEST_' } } });
        await prisma.tenant.deleteMany({ where: { name: 'INT_TEST_TENANT' } });
        await prisma.$disconnect();
    });

    it('should register a new tenant and admin user, then login successfully', async () => {
        const testUser = {
            username: 'INT_TEST_ADMIN',
            password: 'password123',
            role: 'ADMIN',
            tenantName: 'INT_TEST_TENANT'
        };

        // We mock decryptData just for the test to avoid setting up frontend encryption
        jest.spyOn(cryptoUtils, 'decryptData').mockImplementation((data) => data);

        // 1. Register
        const registerRes = await request(app)
            .post('/api/v1/auth/register')
            .send(testUser);

        expect(registerRes.status).toBe(201);
        expect(registerRes.body.status).toBe('success');
        expect(registerRes.body.token).toBeDefined();

        const tenantId = registerRes.body.data.user.tenantId;
        expect(tenantId).toBeDefined();

        // 2. Login
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({
                username: testUser.username,
                password: testUser.password
            });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.status).toBe('success');
        expect(loginRes.body.token).toBeDefined();
        expect(loginRes.body.data.user.username).toBe(testUser.username);

        jest.restoreAllMocks();
    });
});
