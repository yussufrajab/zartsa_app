import type { PaymentMethod } from './fine';

export type TicketStatus = 'ACTIVE' | 'CANCELLED' | 'USED' | 'EXPIRED';

export interface Booking {
  id: string;
  userId: string;
  departure: string;
  destination: string;
  travelDate: string;
  passengerCount: number;
  seatNumbers: string[];
  totalAmount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentRef: string | null;
  status: TicketStatus;
  qrCode: string | null;
  vehiclePlate: string | null;
  operatorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RouteSearchResult {
  departure: string;
  destination: string;
  routeType: string;
  availableSeats: number;
  baseFare: number;
  surcharge: number;
  totalFare: number;
  departureTime: string;
  estimatedArrival: string;
}

export interface SeatLayout {
  rows: number;
  seatsPerRow: number;
  layout: SeatInfo[][];
}

export interface SeatInfo {
  number: string;
  isAvailable: boolean;
  isWindow: boolean;
  type: 'standard' | 'premium';
}