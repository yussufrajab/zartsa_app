import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit';
import { searchFares, getAllFares, getFareDetail } from '../services/fare.service';
import type { RouteType } from '@zartsa/shared';

export const faresRoutes = Router();

faresRoutes.use(rateLimit('fares', 50, 3600000));

faresRoutes.get('/search', async (req, res, next) => {
  try {
    const routeType = req.query.routeType as RouteType;
    const departure = req.query.departure as string;
    const destination = req.query.destination as string;

    if (!routeType || !departure || !destination) {
      return res.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message: 'routeType, departure, and destination are required' });
    }

    if (!['daladala', 'shamba'].includes(routeType)) {
      return res.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message: 'Invalid route type' });
    }

    const results = await searchFares(routeType, departure, destination);
    res.json({ status: 'ok', data: results });
  } catch (err) { next(err); }
});

faresRoutes.get('/', async (req, res, next) => {
  try {
    const routeType = req.query.routeType as RouteType | undefined;
    const results = await getAllFares(routeType);
    res.json({ status: 'ok', data: results });
  } catch (err) { next(err); }
});

faresRoutes.get('/:routeType/:departure/:destination', async (req, res, next) => {
  try {
    const { routeType, departure, destination } = req.params;
    const result = await getFareDetail(routeType as RouteType, decodeURIComponent(departure), decodeURIComponent(destination));
    if (!result) {
      return res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Fare not found for this route' });
    }
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});