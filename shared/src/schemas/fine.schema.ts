import { z } from 'zod';

export const PAYMENT_METHODS = ['mpesa', 'airtel_money', 'zantel', 'visa', 'mastercard', 'bank_transfer'] as const;

export const fineQuerySchema = z.object({
  drivingLicense: z.string().optional(),
  vehiclePlate: z.string().optional(),
}).refine(data => data.drivingLicense || data.vehiclePlate, { message: 'Provide either driving license or vehicle plate' });

export const initiatePaymentSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS),
  phoneNumber: z.string().optional(),
});

export const disputeSchema = z.object({
  reason: z.string().min(20).max(2000),
});

export type FineQueryInput = z.infer<typeof fineQuerySchema>;
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type DisputeInput = z.infer<typeof disputeSchema>;