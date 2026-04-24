// server/src/services/zims.service.ts
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

interface ZimsResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ZimsLicenseData {
  documentType: string;
  holderName: string;
  issueDate: string;
  expiryDate: string;
  status: 'Valid' | 'Expired' | 'Suspended' | 'Invalid';
  licenseNumber: string;
}

interface ZimsFineData {
  offenseType: string;
  offenseDate: string;
  location: string;
  penaltyAmount: number;
  paymentStatus: string;
  controlNumber: string;
}

async function zimsRequest<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, env.ZIMS_API_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      'X-API-Key': env.ZIMS_API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    logger.error('ZIMS API error', { path, status: res.status });
    throw new AppError(502, 'Failed to reach ZIMS system', 'ZIMS_ERROR');
  }

  const body: ZimsResponse<T> = await res.json();
  if (!body.success) {
    throw new AppError(404, body.message || 'Record not found in ZIMS', 'ZIMS_NOT_FOUND');
  }

  return body.data;
}

export const zimsService = {
  async verifyLicense(licenseNumber: string): Promise<ZimsLicenseData> {
    return zimsRequest<ZimsLicenseData>('/api/licenses/verify', { number: licenseNumber });
  },

  async verifyVehicle(plateNumber: string): Promise<ZimsLicenseData> {
    return zimsRequest<ZimsLicenseData>('/api/vehicles/verify', { plate: plateNumber });
  },

  async verifyBadge(badgeNumber: string): Promise<ZimsLicenseData> {
    return zimsRequest<ZimsLicenseData>('/api/badges/verify', { number: badgeNumber });
  },

  async getFinesByLicense(licenseNumber: string): Promise<ZimsFineData[]> {
    return zimsRequest<ZimsFineData[]>('/api/fines', { license: licenseNumber });
  },

  async getFinesByVehicle(plateNumber: string): Promise<ZimsFineData[]> {
    return zimsRequest<ZimsFineData[]>('/api/fines', { plate: plateNumber });
  },

  async syncFinePayment(fineId: string, paymentRef: string): Promise<void> {
    await zimsRequest<void>('/api/fines/sync', { fineId, paymentRef });
  },
};