import rateLimit from 'express-rate-limit';

// Strict limiter for authentication routes (Login/Signup)
export const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // Limit each IP to 10 requests per `window` (here, per 10 minutes)
    message: {
        status: 'error',
        message: 'Too many login attempts from this IP, please try again after 10 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Standard limiter for Booking routes
export const bookingLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // Limit each IP to 30 requests per 5 minutes
    message: {
        status: 'error',
        message: 'Too many booking requests created from this IP, please try again after 5 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
