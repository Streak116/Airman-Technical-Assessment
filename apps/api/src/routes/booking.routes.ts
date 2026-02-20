import express from 'express';
import * as bc from '../controllers/booking.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect); // All booking routes require login

router.route('/')
    .get(bc.getAllBookings)
    .post(restrictTo('STUDENT'), bc.createBooking);

router.route('/:id')
    .patch(bc.updateBooking);

export default router;
