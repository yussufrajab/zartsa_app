import { z } from 'zod';

export const CATEGORIES = [
  'FARE_ADJUSTMENT',
  'ROAD_CLOSURE',
  'SCHEDULE_CHANGE',
  'REGULATORY_UPDATE',
  'GENERAL_NOTICE',
] as const;

export const createAnnouncementSchema = z.object({
  titleSw: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  contentSw: z.string().min(1).max(5000),
  contentEn: z.string().min(1).max(5000),
  category: z.enum(CATEGORIES),
  sourceAuthority: z.string().max(200).optional(),
  publishNow: z.boolean().default(false),
});

export const updateAnnouncementSchema = z.object({
  titleSw: z.string().min(1).max(200).optional(),
  titleEn: z.string().min(1).max(200).optional(),
  contentSw: z.string().min(1).max(5000).optional(),
  contentEn: z.string().min(1).max(5000).optional(),
  category: z.enum(CATEGORIES).optional(),
  sourceAuthority: z.string().max(200).optional(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;