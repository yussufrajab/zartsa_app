import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { parsePagination } from '../utils/pagination';
import { initiatePaymentSchema, disputeSchema, fineQuerySchema } from '@zartsa/shared';
import {
  getFinesByLicense,
  getFinesByVehicle,
  getFineById,
  payFine,
  submitDispute,
  getDisputes,
  waiveFine,
} from '../services/fine.service';

export const finesRoutes = Router();

// All routes require authentication
finesRoutes.use(authenticate);

// Rate limit: 50 requests per hour
finesRoutes.use(rateLimit('fines', 50, 3_600_000));

// GET / - Get fines by driving license OR vehicle plate (query params)
finesRoutes.get('/', async (req, res, next) => {
  try {
    const parsed = fineQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Provide either drivingLicense or vehiclePlate query parameter',
      });
    }
    const { drivingLicense, vehiclePlate } = parsed.data;

    if (drivingLicense) {
      const fines = await getFinesByLicense(drivingLicense);
      return res.json({ status: 'ok', data: fines });
    }

    // vehiclePlate is guaranteed here since at least one is required
    const fines = await getFinesByVehicle(vehiclePlate!);
    res.json({ status: 'ok', data: fines });
  } catch (err) { next(err); }
});

// GET /admin/disputes - Officer/admin endpoint, list disputed fines (paginated)
finesRoutes.get('/admin/disputes', authorize('officer', 'admin'), async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, string>);
    const result = await getDisputes(page, limit);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

// GET /:id - Get fine detail by ID
finesRoutes.get('/:id', async (req, res, next) => {
  try {
    const fine = await getFineById(req.params.id as string);
    res.json({ status: 'ok', data: fine });
  } catch (err) { next(err); }
});

// POST /:id/pay - Pay a fine
finesRoutes.post('/:id/pay', validate(initiatePaymentSchema), async (req, res, next) => {
  try {
    const fine = await payFine(
      req.params.id as string,
      req.body.paymentMethod,
      req.body.phoneNumber,
    );
    res.json({ status: 'ok', data: fine });
  } catch (err) { next(err); }
});

// POST /:id/dispute - Submit dispute
finesRoutes.post('/:id/dispute', validate(disputeSchema), async (req, res, next) => {
  try {
    const fine = await submitDispute(
      req.params.id as string,
      req.userId!,
      req.body.reason,
    );
    res.json({ status: 'ok', data: fine });
  } catch (err) { next(err); }
});

const waiveSchema = z.object({ reason: z.string().min(1).max(500).optional() });

// POST /:id/waive - Officer/admin endpoint, waive a fine
finesRoutes.post('/:id/waive', authorize('officer', 'admin'), validate(waiveSchema), async (req, res, next) => {
  try {
    const fine = await waiveFine(req.params.id as string);
    res.json({ status: 'ok', data: fine });
  } catch (err) { next(err); }
});