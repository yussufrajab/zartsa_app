import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { verifyRequestSchema } from '@zartsa/shared';
import { verifyDocument } from '../services/verify.service';

export const verifyRoutes = Router();

verifyRoutes.use(rateLimit('verify', 50, 3600000));

verifyRoutes.post('/',
  validate(verifyRequestSchema),
  async (req, res, next) => {
    try {
      const { documentType, number } = req.body;
      const result = await verifyDocument(documentType, number);
      res.json({ status: 'ok', data: result });
    } catch (err) { next(err); }
  }
);

const numberSchema = z.object({ number: z.string().min(1).max(100) });

verifyRoutes.post('/license', validate(numberSchema), async (req, res, next) => {
  try {
    const result = await verifyDocument('driving_license', req.body.number);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

verifyRoutes.post('/vehicle', validate(numberSchema), async (req, res, next) => {
  try {
    const result = await verifyDocument('road_license', req.body.number);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

verifyRoutes.post('/badge', validate(numberSchema), async (req, res, next) => {
  try {
    const result = await verifyDocument('driver_conductor_badge', req.body.number);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});