import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBookingSchema } from '@zartsa/shared';
import { parsePagination } from '../utils/pagination';
import {
  searchRoutes,
  getSeatLayout,
  createBooking,
  cancelBooking,
  getUserBookings,
  getBookingById,
  generateQRCode,
} from '../services/booking.service';

export const ticketsRoutes = Router();

// === PUBLIC ENDPOINTS (no auth required) ===

// GET /search - Search routes by departure/destination/date query params
ticketsRoutes.get('/search', async (req, res, next) => {
  try {
    const { departure, destination, date } = req.query as Record<string, string | undefined>;

    if (!departure || !destination || !date) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'departure, destination, and date query parameters are required',
      });
    }

    const results = await searchRoutes(departure, destination, date);
    res.json({ status: 'ok', data: results });
  } catch (err) { next(err); }
});

// GET /seats - Get seat layout by departure/destination/date query params
ticketsRoutes.get('/seats', async (req, res, next) => {
  try {
    const { departure, destination, date } = req.query as Record<string, string | undefined>;

    if (!departure || !destination || !date) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'departure, destination, and date query parameters are required',
      });
    }

    const layout = await getSeatLayout(departure, destination, date);
    res.json({ status: 'ok', data: layout });
  } catch (err) { next(err); }
});

// === AUTHENTICATED ENDPOINTS ===

// POST / - Create a booking
ticketsRoutes.post('/', authenticate, validate(createBookingSchema), async (req, res, next) => {
  try {
    const booking = await createBooking({
      userId: req.userId!,
      departure: req.body.departure,
      destination: req.body.destination,
      travelDate: req.body.travelDate,
      passengerCount: req.body.passengerCount,
      seatNumbers: req.body.seatNumbers,
      paymentMethod: req.body.paymentMethod,
      phoneNumber: req.body.phoneNumber,
    });
    res.status(201).json({ status: 'ok', data: booking });
  } catch (err) { next(err); }
});

// GET /my - Get user's bookings (paginated)
ticketsRoutes.get('/my', authenticate, async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, string>);
    const result = await getUserBookings(req.userId!, page, limit);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

// GET /:id - Get booking detail by ID (with ownership check)
ticketsRoutes.get('/:id', authenticate, async (req, res, next) => {
  try {
    const booking = await getBookingById(req.params.id as string, req.userId!);
    res.json({ status: 'ok', data: booking });
  } catch (err) { next(err); }
});

// POST /:id/cancel - Cancel a booking
ticketsRoutes.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const booking = await cancelBooking(req.params.id as string, req.userId!);
    res.json({ status: 'ok', data: booking });
  } catch (err) { next(err); }
});

// GET /:id/qr - Get QR code PNG image for a booking
ticketsRoutes.get('/:id/qr', authenticate, async (req, res, next) => {
  try {
    // Verify ownership first
    await getBookingById(req.params.id as string, req.userId!);

    const qrBuffer = await generateQRCode(req.params.id as string);
    res.set('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (err) { next(err); }
});