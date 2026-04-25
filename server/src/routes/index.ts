import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { notificationRoutes } from './notifications.routes';
import { faresRoutes } from './fares.routes';
import { verifyRoutes } from './verify.routes';
import { newsRoutes } from './news.routes';
import { usersRoutes } from './users.routes';
import { trackingRoutes } from './tracking.routes';
import { lostFoundRoutes } from './lost-found.routes';
import { complaintsRoutes } from './complaints.routes';
import { finesRoutes } from './fines.routes';
import { ticketsRoutes } from './tickets.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/notifications', notificationRoutes);
router.use('/fares', faresRoutes);
router.use('/verify', verifyRoutes);
router.use('/news', newsRoutes);
router.use('/users', usersRoutes);
router.use('/tracking', trackingRoutes);
router.use('/lost-found', lostFoundRoutes);
router.use('/complaints', complaintsRoutes);
router.use('/fines', finesRoutes);
router.use('/tickets', ticketsRoutes);

export const routes = router;