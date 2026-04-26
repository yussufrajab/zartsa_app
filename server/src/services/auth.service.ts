import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { AppError, UnauthorizedError } from '../utils/errors';
import { cacheGet, cacheSet, cacheDelete } from './redis.service';
import { createAndSendNotification } from './notification.service';
import { logger } from '../utils/logger';
import type { LoginRequest, RegisterRequest, AuthUser, AuthTokens } from '@zartsa/shared';

const secret = new TextEncoder().encode(env.JWT_SECRET);

/** Parse duration strings like '15m', '7d', '1h' into milliseconds */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 'ms': return value;
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
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

  // Send welcome notification
  await createAndSendNotification({
    userId: user.id,
    type: 'payment_confirmation',
    title: 'Karibu ZARTSA!',
    message: `Hongera ${user.firstName}! Akaunti yako ya ZARTSA imeundwa kwa mafanikio. Unaweza sasa kutumia huduma zote.`,
  }).catch((err) => {
    // Don't fail registration if notification fails
    logger.warn('Failed to send welcome notification', { error: err.message });
  });

  return generateTokens(user.id, user.role);
}

async function generateTokens(userId: string, role: string): Promise<AuthTokens> {
  const accessToken = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .setIssuedAt()
    .setIssuer('zartsa')
    .setAudience('zartsa-api')
    .sign(secret);

  const refreshToken = await new SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(env.REFRESH_TOKEN_EXPIRES_IN)
    .setIssuedAt()
    .setIssuer('zartsa')
    .setAudience('zartsa-api')
    .sign(secret);

  // Store refresh token in Redis for revocation support
  const refreshTtlMs = parseDuration(env.REFRESH_TOKEN_EXPIRES_IN);
  await cacheSet(`refresh:${userId}`, refreshToken, refreshTtlMs);

  return { accessToken, refreshToken };
}

export async function verifyAccessToken(token: string): Promise<{ userId: string; role: string }> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'zartsa',
      audience: 'zartsa-api',
    });
    return { userId: payload.userId as string, role: payload.role as string };
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export async function refreshToken(refreshToken: string): Promise<AuthTokens> {
  try {
    const { payload } = await jwtVerify(refreshToken, secret, {
      issuer: 'zartsa',
      audience: 'zartsa-api',
    });
    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid refresh token');
    }
    const userId = payload.userId as string;

    // Validate refresh token against Redis (supports revocation)
    const storedToken = await cacheGet<string>(`refresh:${userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }
    return generateTokens(user.id, user.role);
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

/** Logout: revoke the refresh token for a user */
export async function logout(userId: string): Promise<void> {
  await cacheDelete(`refresh:${userId}`);
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