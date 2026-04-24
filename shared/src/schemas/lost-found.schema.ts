import { z } from 'zod';

export const ITEM_CATEGORIES = ['electronics', 'bags', 'documents', 'clothing', 'jewelry', 'keys', 'other'] as const;

export const reportLostItemSchema = z.object({
  description: z.string().min(5).max(1000),
  category: z.enum(ITEM_CATEGORIES),
  route: z.string().min(1),
  travelDate: z.string().datetime(),
  contactInfo: z.string().min(5).max(200),
});

export const reportFoundItemSchema = z.object({
  description: z.string().min(5).max(1000),
  category: z.enum(ITEM_CATEGORIES),
  busNumber: z.string().min(1),
  route: z.string().min(1),
  foundDate: z.string().datetime(),
});

export const claimItemSchema = z.object({
  claimCode: z.string().optional(),
});

export type ReportLostItemInput = z.infer<typeof reportLostItemSchema>;
export type ReportFoundItemInput = z.infer<typeof reportFoundItemSchema>;