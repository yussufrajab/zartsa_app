import { z } from 'zod';

export const DOCUMENT_TYPES = [
  'driving_license',
  'road_license',
  'commercial_vehicle_license',
  'foreign_driving_permit',
  'government_driving_permit',
  'vehicle_visitor_permit',
  'temporary_permit',
  'driver_conductor_badge',
] as const;

export const verifyRequestSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  number: z.string().min(1, 'Document number is required').max(50),
});

export const plateNumberSchema = z.string()
  .regex(/^[A-Za-z]?\s*\d{1,5}\s*[A-Za-z]{0,3}$/, 'Invalid plate number format');

export type VerifyRequestInput = z.infer<typeof verifyRequestSchema>;