import { z } from 'zod';

const tanzaniaPhone = z.string().regex(
  /^(\+255|0)[67]\d{8}$/,
  'Invalid Tanzanian phone number'
);

export const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(100).optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100).optional(),
  email: z.string().email('Invalid email address').optional(),
  nationalId: z.string().min(1).max(50).optional(),
  preferredLanguage: z.enum(['sw', 'en']).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
);

export const saveRouteSchema = z.object({
  departure: z.string().min(1, 'Departure is required').max(200),
  destination: z.string().min(1, 'Destination is required').max(200),
  label: z.string().min(1, 'Label is required').max(100),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal('DELETE', {
    errorMap: () => ({ message: 'Type DELETE to confirm account deletion' }),
  }),
});

export const languageSchema = z.object({
  language: z.enum(['sw', 'en'], { errorMap: () => ({ message: 'Language must be sw or en' }) }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SaveRouteInput = z.infer<typeof saveRouteSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type LanguageInput = z.infer<typeof languageSchema>;