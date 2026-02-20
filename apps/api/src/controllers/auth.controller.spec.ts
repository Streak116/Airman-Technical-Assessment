import { Request, Response, NextFunction } from 'express';
import { register, login, logout } from './auth.controller';
import { prismaMock } from '../test/setup';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as cryptoUtils from '../utils/crypto';
import { AppError } from '../utils/appError';

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../utils/crypto');

describe('Auth Controller', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock<NextFunction>;

    beforeEach(() => {
        mockReq = {
            body: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            cookie: jest.fn()
        };
        mockNext = jest.fn();

        // Default mock implementations
        (cryptoUtils.decryptData as jest.Mock).mockImplementation((data: string) => data);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mockJwtToken');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should create a user and return a token when taking an existing tenantId', async () => {
            mockReq.body = {
                username: 'testuser',
                password: 'password123',
                role: 'STUDENT',
                tenantId: 'tenant-123'
            };

            const mockUser = { id: 'user-1', username: 'TESTUSER', password: 'hashedPassword', role: 'STUDENT', tenantId: 'tenant-123', status: 'PENDING' };
            prismaMock.user.create.mockResolvedValue(mockUser as any);

            await register(mockReq as Request, mockRes as Response, mockNext);

            expect(prismaMock.user.create).toHaveBeenCalledWith({
                data: {
                    username: 'TESTUSER',
                    password: 'hashedPassword',
                    role: 'STUDENT',
                    tenantId: 'tenant-123',
                    status: 'PENDING'
                }
            });
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                token: 'mockJwtToken'
            }));
        });

        it('should call next with AppError if neither tenantName nor tenantId is provided', async () => {
            mockReq.body = {
                username: 'testuser',
                password: 'password123',
                role: 'STUDENT'
            };

            await register(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
            expect(mockNext.mock.calls[0][0].message).toBe('Please provide either an academy name to create or an academy ID to join');
            expect(prismaMock.user.create).not.toHaveBeenCalled();
        });

        it('should call next with error if Zod validation fails', async () => {
            mockReq.body = {
                username: 't', // Too short
                password: 'short', // Too short
                role: 'INVALID_ROLE'
            };

            await register(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
            expect(prismaMock.user.create).not.toHaveBeenCalled();
        });
    });

    describe('login', () => {
        it('should return a token for valid credentials', async () => {
            mockReq.body = { username: 'testuser', password: 'password123' };

            const mockUser = {
                id: 'user-1', username: 'TESTUSER', password: 'hashedPassword',
                role: 'STUDENT', status: 'APPROVED', tenantId: 'tenant-123'
            };

            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

            await login(mockReq as Request, mockRes as Response, mockNext);

            expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
                where: { username: 'TESTUSER' },
                include: { tenant: { select: { id: true, name: true } } }
            });
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                token: 'mockJwtToken'
            }));
        });

        it('should call next with AppError if username or password is missing', async () => {
            mockReq.body = { username: 'testuser' }; // Missing password

            await login(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
            expect(mockNext.mock.calls[0][0].message).toBe('Please provide username and password');
        });

        it('should call next with AppError if user does not exist', async () => {
            mockReq.body = { username: 'nonexistentuser', password: 'password123' };

            prismaMock.user.findUnique.mockResolvedValue(null);

            await login(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
            expect(mockNext.mock.calls[0][0].message).toBe('Incorrect username or password');
        });

        it('should call next with AppError if credentials are wrong', async () => {
            mockReq.body = { username: 'testuser', password: 'wrongpassword' };

            prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashedPassword', status: 'APPROVED' } as any);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Simulate wrong password

            await login(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
            expect(mockNext.mock.calls[0][0].message).toBe('Incorrect username or password');
        });

        it('should call next with AppError if account is suspended', async () => {
            mockReq.body = { username: 'testuser', password: 'password123' };

            prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashedPassword', status: 'SUSPENDED' } as any);

            await login(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            expect(mockNext.mock.calls[0][0].statusCode).toBe(403);
            expect(mockNext.mock.calls[0][0].message).toBe('Your account has been suspended');
        });

        it('should call next with AppError if account is pending approval', async () => {
            mockReq.body = { username: 'testuser', password: 'password123' };

            prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashedPassword', status: 'PENDING' } as any);

            await login(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            expect(mockNext.mock.calls[0][0].statusCode).toBe(403);
            expect(mockNext.mock.calls[0][0].message).toBe('Your account is pending approval by an administrator');
        });
    });

    describe('logout', () => {
        it('should overwrite the JWT cookie and return success', () => {
            logout(mockReq as Request, mockRes as Response);

            expect(mockRes.cookie).toHaveBeenCalledWith('jwt', 'loggedout', expect.objectContaining({
                httpOnly: true
            }));
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success' });
        });
    });
});
