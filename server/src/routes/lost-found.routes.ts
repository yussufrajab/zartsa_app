import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { uploadSingle } from '../middleware/upload';
import { reportLostItemSchema, reportFoundItemSchema, claimItemSchema } from '@zartsa/shared';
import {
  reportLostItem, reportFoundItem, searchFoundItems, getFoundItem, claimFoundItem, reviewItem,
} from '../services/lost-found.service';

export const lostFoundRoutes = Router();

// Public: search found items (no auth)
lostFoundRoutes.get('/found',
  rateLimit('lost-found', 60, 60_000),
  async (req, res, next) => {
    try {
      const result = await searchFoundItems({
        route: req.query.route as string,
        category: req.query.category as any,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        keyword: req.query.keyword as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ status: 'ok', data: result });
    } catch (err) { next(err); }
  }
);

// Public: get single found item
lostFoundRoutes.get('/found/:id',
  rateLimit('lost-found', 60, 60_000),
  async (req, res, next) => {
    try {
      const item = await getFoundItem(req.params.id as string);
      if (!item) {
        return res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Item not found' });
      }
      res.json({ status: 'ok', data: item });
    } catch (err) { next(err); }
  }
);

// Authenticated: report lost item
lostFoundRoutes.post('/lost',
  authenticate,
  rateLimit('lost-found', 10, 60_000),
  validate(reportLostItemSchema),
  async (req, res, next) => {
    try {
      const item = await reportLostItem({ userId: req.userId!, ...req.body, travelDate: new Date(req.body.travelDate) });
      res.status(201).json({ status: 'ok', data: item });
    } catch (err) { next(err); }
  }
);

// Authenticated (operator/driver/officer/admin): report found item with optional photo
lostFoundRoutes.post('/found',
  authenticate,
  authorize('operator', 'driver', 'officer', 'admin'),
  rateLimit('lost-found', 10, 60_000),
  uploadSingle,
  async (req, res, next) => {
    try {
      // Multer puts fields on req.body as strings, validate manually
      const { description, category, busNumber, route, foundDate } = req.body as Record<string, string>;
      if (!description || !category || !busNumber || !route || !foundDate) {
        return res.status(400).json({ status: 'error', message: 'Missing required fields' });
      }

      const photoBuffer = req.file?.buffer;
      const photoMimetype = req.file?.mimetype;
      const item = await reportFoundItem({
        reportedBy: req.userId!,
        description,
        category: category as any,
        busNumber,
        route,
        foundDate: new Date(foundDate),
        photoBuffer,
        photoMimetype,
      });
      res.status(201).json({ status: 'ok', data: item });
    } catch (err) { next(err); }
  }
);

// Authenticated: claim a found item
lostFoundRoutes.post('/found/:id/claim',
  authenticate,
  rateLimit('lost-found', 10, 60_000),
  validate(claimItemSchema),
  async (req, res, next) => {
    try {
      const item = await claimFoundItem(req.params.id as string, req.userId!);
      res.json({ status: 'ok', data: item });
    } catch (err) { next(err); }
  }
);

// Officer: review/approve items
lostFoundRoutes.patch('/found/:id/review',
  authenticate,
  authorize('officer', 'admin'),
  async (req, res, next) => {
    try {
      const action = req.body.action as 'approve' | 'reject';
      if (action !== 'approve' && action !== 'reject') {
        return res.status(400).json({ status: 'error', message: 'Action must be approve or reject' });
      }
      const item = await reviewItem(req.params.id as string, action);
      res.json({ status: 'ok', data: item });
    } catch (err) { next(err); }
  }
);