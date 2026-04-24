import { z } from 'zod';

export const fareSearchSchema = z.object({
  routeType: z.enum(['daladala', 'shamba']),
  departure: z.string().min(1, 'Departure is required'),
  destination: z.string().min(1, 'Destination is required'),
});

export type FareSearchInput = z.infer<typeof fareSearchSchema>;