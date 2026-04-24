import { z } from 'zod';
import { NOTIFICATION_TYPES } from '../constants/notification-types';

export const updatePreferenceSchema = z.object({
  type: z.enum(Object.values(NOTIFICATION_TYPES) as [string, ...string[]]),
  inApp: z.boolean().optional(),
  sms: z.boolean().optional(),
  email: z.boolean().optional(),
});

export const markReadSchema = z.object({
  ids: z.array(z.string()).min(1).max(50),
});

export type UpdatePreferenceInput = z.infer<typeof updatePreferenceSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;