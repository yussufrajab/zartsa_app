import { z } from 'zod';

export const gpsUpdateSchema = z.object({
  vehiclePlate: z.string().min(1, 'Vehicle plate is required').max(20),
  operatorId: z.string().optional(),
  route: z.string().min(1, 'Route is required').max(200),
  serviceType: z.enum(['daladala', 'shamba'], {
    errorMap: () => ({ message: 'Service type must be daladala or shamba' }),
  }),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  recordedAt: z.string().datetime().optional(),
});

export const trackingFilterSchema = z.object({
  route: z.string().optional(),
  operatorId: z.string().optional(),
  serviceType: z.enum(['daladala', 'shamba']).optional(),
});

export type GpsUpdateInput = z.infer<typeof gpsUpdateSchema>;
export type TrackingFilterInput = z.infer<typeof trackingFilterSchema>;