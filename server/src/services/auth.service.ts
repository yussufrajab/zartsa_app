import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { AppError, UnauthorizedError } from '../utils/errors';
import { cacheGet, cacheSet } from './redis.service';
import type { LoginRequest, RegisterRequest, AuthUser, AuthTokens } from '@zartsa/shared';

const prisma = new PrismaClient();
const secret = new TextEncoder().encode(env.JWT_SECRET);

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestOtp(phone: string): Promise<void> {
  const otp = generateOtp();
  await cacheSet(`otp:${phone}`, otp, env.OTP_EXPIRES_IN);
  // In development, log the OTP. In production, send via SMS gateway.
  if (env.NODE_ENV === 'development') {
    console.log(`[DEV OTP] ${phone}: ${otp}`);
  }
  // TODO: integrate SMS gateway in notifications module
}

export async function login(data: LoginRequest): Promise<AuthTokens> {
  const cachedOtp = await cacheGet<string>(`otp:${data.phone}`);
  if (!cachedOtp || cachedOtp !== data.otp) {
    throw new UnauthorizedError('Invalid or expired OTP');
  }

  const user = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Account not found or inactive');
  }

  // Check account lock
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new UnauthorizedError('Account temporarily locked. Try again later.');
  }

  // Reset failed attempts on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  // Remove used OTP
  await cacheSet(`otp:${data.phone}`, '', 1);

  return generateTokens(user.id, user.role);
}

export async function register(data: RegisterRequest): Promise<AuthTokens> {
  const cachedOtp = await cacheGet<string>(`otp:${data.phone}`);
  if (!cachedOtp || cachedOtp !== data.otp) {
    throw new UnauthorizedError('Invalid or expired OTP');
  }

  const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (existing) {
    throw new AppError(409, 'Phone number already registered', 'DUPLICATE');
  }

  const user = await prisma.user.create({
    data: {
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      preferredLanguage: data.preferredLanguage,
      role: 'CITIZEN',
    },
  });

  // Remove used OTP
  await cacheSet(`otp:${data.phone}`, '', 1);

  return generateTokens(user.id, user.role);
}

async function generateTokens(userId: string, role: string): Promise<AuthTokens> {
  const accessToken = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .setIssuedAt()
    .sign(secret);

  const refreshToken = await new SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(env.REFRESH_TOKEN_EXPIRES_IN)
    .setIssuedAt()
    .sign(secret);

  return { accessToken, refreshToken };
}

export async function verifyAccessToken(token: string): Promise<{ userId: string; role: string }> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { userId: payload.userId as string, role: payload.role as string };
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export async function getAuthUser(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError('User not found');

  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    role: user.role.toLowerCase() as AuthUser['role'],
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
  };
}