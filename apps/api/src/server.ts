import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes';
import tenantRouter from './routes/tenant.routes';
import learningRouter from './routes/learning.routes';
import userRouter from './routes/user.routes';
import bookingRouter from './routes/booking.routes';
import { AppError } from './utils/appError';
import { globalErrorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/tenants', tenantRouter);
app.use('/api/v1/learning', learningRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/bookings', bookingRouter);

app.get('/', (req, res) => {
    res.json({ message: 'Airman API is running!' });
});

// 404 handler
app.all('*', (req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

export default app;
