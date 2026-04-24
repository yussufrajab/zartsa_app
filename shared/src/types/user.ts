import type { UserRole } from './auth';

export interface User {
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  nationalId: string | null;
  preferredLanguage: 'sw' | 'en';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  savedRoutes: SavedRoute[];
  notificationPreferences: NotificationPreference[];
}

export interface SavedRoute {
  id: string;
  userId: string;
  departure: string;
  destination: string;
  label: string;
}

export interface NotificationPreference {
  type: string;
  inApp: boolean;
  sms: boolean;
  email: boolean;
}