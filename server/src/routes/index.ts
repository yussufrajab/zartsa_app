import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { notificationRoutes } from './notifications.routes';
import { faresRoutes } from './fares.routes';
import { verifyRoutes } from './verify.routes';
import { newsRoutes } from './news.routes';
import { usersRoutes } from './users.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/notifications', notificationRoutes);
router.use('/fares', faresRoutes);
router.use('/verify', verifyRoutes);
router.use('/news', newsRoutes);
router.use('/users', usersRoutes);

export const routes = router;