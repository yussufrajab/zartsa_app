import { z } from 'zod';

export const COMPLAINT_CATEGORIES = [
  'reckless_driving',
  'overcharging',
  'harassment',
  'poor_vehicle_condition',
  'route_cutting',
  'operating_without_license',
] as const;

export const createComplaintSchema = z.object({
  vehiclePlate: z.string().min(1).max(20),
  route: z.string().min(1).max(200),
  incidentDate: z.string().datetime(),
  category: z.enum(COMPLAINT_CATEGORIES),
  description: z.string().min(10).max(1000),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED']),
  resolution: z.string().max(2000).optional(),
});

export const assignComplaintSchema = z.object({
  assignedTo: z.string(),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;