import { z } from 'zod';

export const routeSearchSchema = z.object({
  departure: z.string().min(1),
  destination: z.string().min(1),
  date: z.string().datetime(),
  passengers: z.number().min(1).max(10).default(1),
});

export const createBookingSchema = z.object({
  departure: z.string().min(1),
  destination: z.string().min(1),
  travelDate: z.string().datetime(),
  passengerCount: z.number().min(1).max(10),
  seatNumbers: z.array(z.string()).min(1),
  paymentMethod: z.enum(['mpesa', 'airtel_money', 'zantel', 'visa', 'mastercard', 'bank_transfer']),
  phoneNumber: z.string().optional(),
});

export type RouteSearchInput = z.infer<typeof routeSearchSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;