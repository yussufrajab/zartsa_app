import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { gpsUpdateSchema, trackingFilterSchema } from '@zartsa/shared';
import { getBusPositions, ingestGPS, getBusStops } from '../services/tracking.service';

export const trackingRoutes = Router();

// GET /api/tracking/buses - Get current bus positions (no auth required)
trackingRoutes.get('/buses',
  rateLimit('tracking', 60, 60_000),
  async (req, res, next) => {
    try {
      const filterResult = trackingFilterSchema.safeParse(req.query);
      const filter = filterResult.success ? filterResult.data : {};
      const positions = await getBusPositions(filter);
      res.json({ status: 'ok', data: positions });
    } catch (err) { next(err); }
  }
);

// GET /api/tracking/stops - Bus stop directory (no auth required)
trackingRoutes.get('/stops',
  rateLimit('tracking', 60, 60_000),
  async (_req, res, next) => {
    try {
      const stops = await getBusStops();
      res.json({ status: 'ok', data: stops });
    } catch (err) { next(err); }
  }
);

// POST /api/tracking/update - Ingest GPS data (auth required: operator, driver, admin)
trackingRoutes.post('/update',
  authenticate,
  authorize('operator', 'driver', 'admin'),
  rateLimit('gps-update', 120, 60_000),
  validate(gpsUpdateSchema),
  async (req, res, next) => {
    try {
      const location = await ingestGPS(req.body);
      res.status(201).json({ status: 'ok', data: location });
    } catch (err) { next(err); }
  }
);