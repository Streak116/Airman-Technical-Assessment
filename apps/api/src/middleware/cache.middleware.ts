import { Request, Response, NextFunction } from 'express';
import IORedis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');

const redisNode = process.env.NODE_ENV === 'test'
    ? require('ioredis-mock')
    : IORedis;

export const redisClient = new redisNode({
    host: redisHost,
    port: redisPort,
});

export const cacheMiddleware = (durationInSeconds: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Skip caching in test environment or if explicitly disabled
        if (process.env.NODE_ENV === 'test' || process.env.DISABLE_CACHE === 'true') {
            return next();
        }

        if (req.method !== 'GET') {
            return next();
        }

        const tenantId = req.user?.tenantId || 'PUBLIC';
        const key = `cache:${tenantId}:${req.originalUrl}`;

        try {
            const cachedResponse = await redisClient.get(key);
            if (cachedResponse) {
                const parsed = JSON.parse(cachedResponse);
                return res.status(200).json(parsed);
            }

            // Override res.json to intercept the response and cache it
            const originalJson = res.json.bind(res);
            res.json = (body: any) => {
                // Only cache successful responses
                const statusCode = res.statusCode;
                if (statusCode >= 200 && statusCode < 300) {
                    redisClient.setex(key, durationInSeconds, JSON.stringify(body)).catch((err: any) => {
                        console.error('Redis Cache Set Error:', err);
                    });
                }
                return originalJson(body);
            };

            next();
        } catch (err) {
            console.error('Redis Cache Get Error:', err);
            next();
        }
    };
};

export const invalidateCachePrefix = async (prefix: string) => {
    try {
        if (process.env.NODE_ENV === 'test') return;
        const keys = await redisClient.keys(`cache:${prefix}:*`);
        if (keys.length > 0) {
            await redisClient.del(...keys);
        }
    } catch (err) {
        console.error('Redis Cache Invalidate Error:', err);
    }
};
