import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { uploadMultiple } from '../middleware/upload';
import { uploadFile } from '../services/minio.service';
import { createComplaintSchema, updateStatusSchema, assignComplaintSchema } from '@zartsa/shared';
import {
  createComplaint,
  getComplaintByReference,
  getUserComplaints,
  getAllComplaints,
  updateComplaintStatus,
  assignComplaint,
  exportComplaintsCsv,
} from '../services/complaint.service';
import type { ComplaintCategory, ComplaintStatus } from '@zartsa/shared';

export const complaintsRoutes = Router();

// === PUBLIC ENDPOINTS ===

// POST / - Submit a complaint (public, rate limited)
complaintsRoutes.post(
  '/',
  rateLimit('complaints', 10, 3_600_000),
  uploadMultiple,
  async (req, res, next) => {
    try {
      // Multer puts text fields as strings on req.body; validate them
      const parsed = createComplaintSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        });
      }

      // Upload attachments to MinIO if files were provided
      const attachments: string[] = [];
      const files = req.files as Express.Multer.File[] | undefined;
      if (files && files.length > 0) {
        for (const file of files) {
          const objectName = `complaints/${Date.now()}-${file.originalname}`;
          const url = await uploadFile(objectName, file.buffer, file.mimetype);
          attachments.push(url);
        }
      }

      const complaint = await createComplaint({
        ...parsed.data,
        userId: req.userId, // may be undefined for anonymous users
        attachments,
      });

      res.status(201).json({ status: 'ok', data: complaint });
    } catch (err) { next(err); }
  }
);

// GET /track/:reference - Track a complaint by reference number (public)
complaintsRoutes.get('/track/:reference', async (req, res, next) => {
  try {
    const complaint = await getComplaintByReference(req.params.reference as string);
    if (!complaint) {
      return res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Complaint not found' });
    }
    res.json({ status: 'ok', data: complaint });
  } catch (err) { next(err); }
});

// === AUTHENTICATED ENDPOINTS ===

// GET /my - Get current user's complaints (paginated)
complaintsRoutes.get('/my', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await getUserComplaints(req.userId!, page, limit);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

// === OFFICER/ADMIN ENDPOINTS ===

// GET /admin/all - List all complaints with filters (paginated)
complaintsRoutes.get('/admin/all', authenticate, authorize('officer', 'admin'), async (req, res, next) => {
  try {
    const status = req.query.status as ComplaintStatus | undefined;
    const category = req.query.category as ComplaintCategory | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await getAllComplaints({ status, category, page, limit });
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

// PATCH /:id/status - Update complaint status
complaintsRoutes.patch(
  '/:id/status',
  authenticate,
  authorize('officer', 'admin'),
  validate(updateStatusSchema),
  async (req, res, next) => {
    try {
      const complaint = await updateComplaintStatus(req.params.id as string, req.body);
      res.json({ status: 'ok', data: complaint });
    } catch (err) { next(err); }
  }
);

// PATCH /:id/assign - Assign complaint to an officer
complaintsRoutes.patch(
  '/:id/assign',
  authenticate,
  authorize('officer', 'admin'),
  validate(assignComplaintSchema),
  async (req, res, next) => {
    try {
      const complaint = await assignComplaint(req.params.id as string, req.body.assignedTo);
      res.json({ status: 'ok', data: complaint });
    } catch (err) { next(err); }
  }
);

// GET /admin/export - Export complaints as CSV
complaintsRoutes.get('/admin/export', authenticate, authorize('officer', 'admin'), async (req, res, next) => {
  try {
    const status = req.query.status as ComplaintStatus | undefined;
    const category = req.query.category as ComplaintCategory | undefined;
    const csv = await exportComplaintsCsv({ status, category });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=complaints.csv');
    res.send(csv);
  } catch (err) { next(err); }
});