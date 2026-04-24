import { z } from 'zod';

const tanzaniaPhone = z.string().regex(
  /^(\+255|0)[67]\d{8}$/,
  'Invalid Tanzanian phone number'
);

export const otpRequestSchema = z.object({
  phone: tanzaniaPhone,
});

export const loginSchema = z.object({
  phone: tanzaniaPhone,
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const registerSchema = z.object({
  phone: tanzaniaPhone,
  otp: z.string().length(6, 'OTP must be 6 digits'),
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  email: z.string().email().optional(),
  preferredLanguage: z.enum(['sw', 'en']),
});

export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;