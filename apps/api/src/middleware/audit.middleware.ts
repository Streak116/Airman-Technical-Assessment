import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            correlationId?: string;
        }
    }
}

export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Check if the client sent a trace ID, otherwise generate a new one
    req.correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();

    // Attach it to the response headers as well
    res.setHeader('X-Correlation-ID', req.correlationId);

    next();
};
