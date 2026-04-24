import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { updateProfileSchema, saveRouteSchema, deleteAccountSchema } from '@zartsa/shared';
import {
  getUserProfile,
  updateUserProfile,
  updateLanguage,
  saveRoute,
  deleteSavedRoute,
  deleteAccount,
  getDashboardHistory,
} from '../services/user.service';

export const usersRoutes = Router();

usersRoutes.use(authenticate);

// GET /api/users/me - Get current user profile
usersRoutes.get('/me',
  rateLimit('profile', 30, 60_000),
  async (req, res, next) => {
    try {
      const profile = await getUserProfile(req.userId!);
      res.json({ status: 'ok', data: profile });
    } catch (err) { next(err); }
  }
);

// PUT /api/users/me - Update current user profile
usersRoutes.put('/me',
  rateLimit('profile-update', 10, 60_000),
  validate(updateProfileSchema),
  async (req, res, next) => {
    try {
      const profile = await updateUserProfile(req.userId!, req.body, req.ip);
      res.json({ status: 'ok', data: profile });
    } catch (err) { next(err); }
  }
);

// DELETE /api/users/me - Delete (deactivate) account
usersRoutes.delete('/me',
  rateLimit('account-delete', 3, 3600_000),
  validate(deleteAccountSchema),
  async (req, res, next) => {
    try {
      await deleteAccount(req.userId!, req.ip);
      res.json({ status: 'ok', message: 'Account deleted successfully' });
    } catch (err) { next(err); }
  }
);

// PUT /api/users/me/language - Update preferred language
usersRoutes.put('/me/language',
  rateLimit('profile-update', 10, 60_000),
  async (req, res, next) => {
    try {
      const { language } = req.body as { language: 'sw' | 'en' };
      if (language !== 'sw' && language !== 'en') {
        return res.status(400).json({ status: 'error', message: 'Language must be sw or en' });
      }
      const result = await updateLanguage(req.userId!, language as 'sw' | 'en');
      res.json({ status: 'ok', data: result });
    } catch (err) { next(err); }
  }
);

// POST /api/users/me/routes - Save a route
usersRoutes.post('/me/routes',
  rateLimit('save-route', 20, 60_000),
  validate(saveRouteSchema),
  async (req, res, next) => {
    try {
      const route = await saveRoute(req.userId!, req.body);
      res.status(201).json({ status: 'ok', data: route });
    } catch (err) { next(err); }
  }
);

// DELETE /api/users/me/routes/:routeId - Delete a saved route
usersRoutes.delete('/me/routes/:routeId',
  rateLimit('save-route', 20, 60_000),
  async (req, res, next) => {
    try {
      await deleteSavedRoute(req.userId!, req.params.routeId as string);
      res.json({ status: 'ok', message: 'Route removed' });
    } catch (err) { next(err); }
  }
);

// GET /api/users/me/history - Get dashboard history
usersRoutes.get('/me/history',
  rateLimit('profile', 30, 60_000),
  async (req, res, next) => {
    try {
      const history = await getDashboardHistory(req.userId!);
      res.json({ status: 'ok', data: history });
    } catch (err) { next(err); }
  }
);