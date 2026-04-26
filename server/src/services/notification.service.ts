import { prisma } from '../lib/prisma';
import { pushQueue, smsQueue, emailQueue } from './queue.service';
import { NOTIFICATION_TYPES, DEFAULT_NOTIFICATION_PREFS, type NotificationType } from '@zartsa/shared';
import { logger } from '../utils/logger';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  forceChannel?: 'IN_APP' | 'SMS' | 'EMAIL';
}

export async function createAndSendNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, forceChannel } = params;

  // Fetch preference and user info in a single parallel query
  const [pref, user] = await Promise.all([
    prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, email: true },
    }),
  ]);

  const defaults = DEFAULT_NOTIFICATION_PREFS[type];
  const inApp = forceChannel === 'IN_APP' || (!forceChannel && (pref?.inApp ?? defaults.inApp));
  const sms = forceChannel === 'SMS' || (!forceChannel && (pref?.sms ?? defaults.sms));
  const email = forceChannel === 'EMAIL' || (!forceChannel && (pref?.email ?? defaults.email));

  const notifications = [];

  if (inApp) {
    const notification = await prisma.notification.create({
      data: { userId, type, title, message, channel: 'IN_APP', isRead: false },
    });
    notifications.push(notification);

    await pushQueue.add('push', {
      userId,
      title,
      message,
      notificationId: notification.id,
      type,
    });
  }

  if (sms && user?.phone) {
    await smsQueue.add('sms', {
      to: user.phone,
      message: `[ZARTSA] ${message}`,
    });
  }

  if (email && user?.email) {
    await emailQueue.add('email', {
      to: user.email,
      subject: title,
      body: message,
    });
  }

  return notifications;
}

export async function getUserNotifications(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, channel: 'IN_APP' },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId, channel: 'IN_APP' } }),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function markAsRead(userId: string, ids: string[]) {
  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId, isRead: false },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, channel: 'IN_APP', isRead: false },
    data: { isRead: true },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, channel: 'IN_APP', isRead: false },
  });
}

export async function getPreferences(userId: string) {
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId },
  });

  const allTypes = Object.values(NOTIFICATION_TYPES) as NotificationType[];
  return allTypes.map((type) => {
    const existing = prefs.find((p) => p.type === type);
    const defaults = DEFAULT_NOTIFICATION_PREFS[type];
    return existing ?? {
      id: `default-${type}`,
      userId,
      type,
      inApp: defaults.inApp,
      sms: defaults.sms,
      email: defaults.email,
    };
  });
}

export async function updatePreference(userId: string, type: NotificationType, updates: { inApp?: boolean; sms?: boolean; email?: boolean }) {
  return prisma.notificationPreference.upsert({
    where: { userId_type: { userId, type } },
    update: updates,
    create: { userId, type, ...updates },
  });
}