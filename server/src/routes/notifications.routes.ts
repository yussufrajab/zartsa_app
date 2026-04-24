import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { markReadSchema, updatePreferenceSchema } from '@zartsa/shared';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getPreferences,
  updatePreference,
} from '../services/notification.service';

export const notificationRoutes = Router();

notificationRoutes.use(authenticate);

notificationRoutes.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await getUserNotifications(req.userId!, page, limit);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

notificationRoutes.get('/unread-count', async (req, res, next) => {
  try {
    const count = await getUnreadCount(req.userId!);
    res.json({ status: 'ok', data: { count } });
  } catch (err) { next(err); }
});

notificationRoutes.patch('/read', validate(markReadSchema), async (req, res, next) => {
  try {
    await markAsRead(req.userId!, req.body.ids);
    res.json({ status: 'ok' });
  } catch (err) { next(err); }
});

notificationRoutes.patch('/read-all', async (req, res, next) => {
  try {
    await markAllAsRead(req.userId!);
    res.json({ status: 'ok' });
  } catch (err) { next(err); }
});

notificationRoutes.get('/preferences', async (req, res, next) => {
  try {
    const prefs = await getPreferences(req.userId!);
    res.json({ status: 'ok', data: prefs });
  } catch (err) { next(err); }
});

notificationRoutes.patch('/preferences', validate(updatePreferenceSchema), async (req, res, next) => {
  try {
    const { type, ...updates } = req.body;
    const pref = await updatePreference(req.userId!, type, updates);
    res.json({ status: 'ok', data: pref });
  } catch (err) { next(err); }
});