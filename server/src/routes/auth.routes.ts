import { Router } from 'express';
import { validate } from '../middleware/validate';
import { otpRequestSchema, loginSchema, registerSchema } from '@zartsa/shared';
import { requestOtp, login, register, refreshToken, logout } from '../services/auth.service';
import { rateLimit } from '../middleware/rateLimit';
import { authenticate } from '../middleware/auth';
import { getAuthUser } from '../services/auth.service';

export const authRoutes = Router();

authRoutes.post('/otp',
  rateLimit('otp', 5, 60_000),
  validate(otpRequestSchema),
  async (req, res, next) => {
    try {
      await requestOtp(req.body.phone);
      res.json({ status: 'ok', message: 'OTP sent' });
    } catch (err) { next(err); }
  }
);

authRoutes.post('/login',
  rateLimit('auth-login', 10, 15 * 60 * 1000),
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const tokens = await login(req.body);
      res.json({ status: 'ok', data: tokens });
    } catch (err) { next(err); }
  }
);

authRoutes.post('/register',
  rateLimit('auth-register', 5, 60 * 60 * 1000),
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const tokens = await register(req.body);
      res.json({ status: 'ok', data: tokens });
    } catch (err) { next(err); }
  }
);

authRoutes.get('/me',
  authenticate,
  async (req, res, next) => {
    try {
      const user = await getAuthUser(req.userId!);
      res.json({ status: 'ok', data: user });
    } catch (err) { next(err); }
  }
);

authRoutes.post('/refresh', rateLimit('auth-refresh', 20, 60 * 1000), async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message: 'Refresh token required' });
    }
    const tokens = await refreshToken(token);
    res.json({ status: 'ok', data: tokens });
  } catch (err) { next(err); }
});

authRoutes.post('/logout', authenticate, async (req, res, next) => {
  try {
    await logout(req.userId!);
    res.json({ status: 'ok', message: 'Logged out successfully' });
  } catch (err) { next(err); }
});