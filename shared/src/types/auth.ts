export type UserRole = 'citizen' | 'operator' | 'driver' | 'officer' | 'admin';

export interface AuthUser {
  id: string;
  phone: string;
  email: string | null;
  role: UserRole;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  phone: string;
  otp: string;
}

export interface RegisterRequest {
  phone: string;
  otp: string;
  firstName: string;
  lastName: string;
  email?: string;
  preferredLanguage: 'sw' | 'en';
}

export interface OtpRequest {
  phone: string;
}