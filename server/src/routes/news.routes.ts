import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { parsePagination } from '../utils/pagination';
import { createAnnouncementSchema, updateAnnouncementSchema } from '@zartsa/shared';
import {
  listPublishedAnnouncements,
  getPublishedAnnouncement,
  listAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  unpublishAnnouncement,
  deleteAnnouncement,
} from '../services/news.service';
import type { AnnouncementCategory } from '@zartsa/shared';

export const newsRoutes = Router();

// === PUBLIC ENDPOINTS (no auth required) ===

newsRoutes.get('/', async (req, res, next) => {
  try {
    const category = req.query.category as AnnouncementCategory | undefined;
    const { page, limit } = parsePagination(req.query as Record<string, string>);
    const result = await listPublishedAnnouncements(category, page, limit);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

newsRoutes.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const announcement = await getPublishedAnnouncement(id);
    if (!announcement) {
      return res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Announcement not found' });
    }
    res.json({ status: 'ok', data: announcement });
  } catch (err) { next(err); }
});

// === ADMIN ENDPOINTS (officer/admin only) ===

newsRoutes.get('/admin/all', authenticate, authorize('officer', 'admin'), async (req, res, next) => {
  try {
    const category = req.query.category as AnnouncementCategory | undefined;
    const { page, limit } = parsePagination(req.query as Record<string, string>);
    const result = await listAllAnnouncements(category, page, limit);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

newsRoutes.post('/', authenticate, authorize('officer', 'admin'), validate(createAnnouncementSchema), async (req, res, next) => {
  try {
    const announcement = await createAnnouncement(req.body);
    res.status(201).json({ status: 'ok', data: announcement });
  } catch (err) { next(err); }
});

newsRoutes.patch('/:id', authenticate, authorize('officer', 'admin'), validate(updateAnnouncementSchema), async (req, res, next) => {
  try {
    const announcement = await updateAnnouncement(req.params.id as string, req.body);
    res.json({ status: 'ok', data: announcement });
  } catch (err) { next(err); }
});

newsRoutes.post('/:id/publish', authenticate, authorize('officer', 'admin'), async (req, res, next) => {
  try {
    const announcement = await publishAnnouncement(req.params.id as string);
    res.json({ status: 'ok', data: announcement });
  } catch (err) { next(err); }
});

newsRoutes.post('/:id/unpublish', authenticate, authorize('officer', 'admin'), async (req, res, next) => {
  try {
    const announcement = await unpublishAnnouncement(req.params.id as string);
    res.json({ status: 'ok', data: announcement });
  } catch (err) { next(err); }
});

newsRoutes.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await deleteAnnouncement(req.params.id as string);
    res.json({ status: 'ok', message: 'Announcement deleted' });
  } catch (err) { next(err); }
});