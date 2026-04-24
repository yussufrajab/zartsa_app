import type { NotificationType } from '../constants/notification-types';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: 'IN_APP' | 'SMS' | 'EMAIL';
  isRead: boolean;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  type: NotificationType;
  inApp: boolean;
  sms: boolean;
  email: boolean;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}