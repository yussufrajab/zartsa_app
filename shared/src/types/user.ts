import type { UserRole } from './auth';
import type { NotificationType } from '../constants/notification-types';

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
  notificationPreferences: { id: string; userId: string; type: NotificationType; inApp: boolean; sms: boolean; email: boolean }[];
}

export interface SavedRoute {
  id: string;
  userId: string;
  departure: string;
  destination: string;
  label: string;
}

export interface BookingHistoryItem {
  id: string;
  departure: string;
  destination: string;
  travelDate: string;
  totalAmount: number;
  currency: string;
  status: string;
  qrCode: string | null;
  createdAt: string;
}

export interface VerificationHistoryItem {
  id: string;
  documentType: string;
  query: string;
  status: string;
  verifiedAt: string;
}

export interface ComplaintHistoryItem {
  id: string;
  referenceNumber: string;
  vehiclePlate: string;
  category: string;
  status: string;
  createdAt: string;
}

export interface FineHistoryItem {
  id: string;
  offenseType: string;
  location: string;
  penaltyAmount: number;
  currency: string;
  paymentStatus: string;
  controlNumber: string;
  createdAt: string;
}

export interface DashboardHistory {
  bookings: BookingHistoryItem[];
  verifications: VerificationHistoryItem[];
  complaints: ComplaintHistoryItem[];
  fines: FineHistoryItem[];
}