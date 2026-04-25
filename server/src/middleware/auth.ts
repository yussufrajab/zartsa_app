import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import type { UserRole } from '@zartsa/shared';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: UserRole;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing authorization token'));
  }

  const token = header.slice(7);
  verifyAccessToken(token)
    .then(({ userId, role }) => {
      req.userId = userId;
      req.userRole = role as UserRole;
      next();
    })
    .catch(next);
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userRole = req.userRole?.toLowerCase() as UserRole | undefined;
    if (!userRole || !roles.includes(userRole)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}