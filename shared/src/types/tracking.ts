export interface BusPosition {
  id: string;
  vehiclePlate: string;
  operatorId: string | null;
  route: string;
  serviceType: 'daladala' | 'shamba';
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
  isStale: boolean;
}

export interface BusStop {
  id: string;
  name: string;
  nameSw: string;
  nameEn: string;
  latitude: number;
  longitude: number;
  servedRoutes: string[];
}

export interface TrackingFilter {
  route?: string;
  operatorId?: string;
  serviceType?: 'daladala' | 'shamba';
}

export interface DelayAlert {
  id: string;
  vehiclePlate: string;
  route: string;
  delayMinutes: number;
  threshold: number;
  createdAt: string;
}

export interface GpsUpdate {
  vehiclePlate: string;
  operatorId?: string;
  route: string;
  serviceType: 'daladala' | 'shamba';
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  recordedAt?: string;
}