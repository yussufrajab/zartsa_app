import { cacheGet, cacheSet } from './redis.service';
import { zimsService } from './zims.service';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';
import type { DocumentType, VerificationResult, DocumentStatus } from '@zartsa/shared';

const CACHE_TTL_VALID = 300;    // 5 minutes for valid documents
const CACHE_TTL_NOT_FOUND = 60; // 1 minute for not-found results

const DOCUMENT_TYPE_ZIMS_MAP: Record<DocumentType, string> = {
  driving_license: 'zodlap',
  road_license: 'road_license',
  commercial_vehicle_license: 'commercial',
  foreign_driving_permit: 'foreign_permit',
  government_driving_permit: 'government_permit',
  vehicle_visitor_permit: 'visitor_permit',
  temporary_permit: 'temporary',
  driver_conductor_badge: 'badge',
};

export function formatPlateNumber(input: string): string {
  const cleaned = input.replace(/\s+/g, '').toUpperCase();
  return cleaned;
}

export async function verifyDocument(documentType: DocumentType, number: string): Promise<VerificationResult> {
  const formattedNumber = formatPlateNumber(number);
  const cacheKey = `verify:${documentType}:${formattedNumber}`;

  const cached = await cacheGet<VerificationResult | { notFound: true }>(cacheKey);
  if (cached) {
    if ('notFound' in cached) {
      throw new NotFoundError('Document not found in ZIMS system');
    }
    return cached as VerificationResult;
  }

  try {
    let result: VerificationResult;

    switch (documentType) {
      case 'driving_license':
      case 'foreign_driving_permit':
      case 'government_driving_permit':
      case 'temporary_permit': {
        const zimsData = await zimsService.verifyLicense(formattedNumber);
        result = {
          documentType,
          holderName: maskName(zimsData.holderName),
          issueDate: zimsData.issueDate,
          expiryDate: zimsData.expiryDate,
          status: zimsData.status as DocumentStatus,
          documentNumber: zimsData.licenseNumber,
        };
        break;
      }
      case 'road_license':
      case 'commercial_vehicle_license':
      case 'vehicle_visitor_permit': {
        const zimsData = await zimsService.verifyVehicle(formattedNumber);
        result = {
          documentType,
          holderName: maskName(zimsData.holderName),
          issueDate: zimsData.issueDate,
          expiryDate: zimsData.expiryDate,
          status: zimsData.status as DocumentStatus,
          documentNumber: zimsData.licenseNumber,
        };
        break;
      }
      case 'driver_conductor_badge': {
        const zimsData = await zimsService.verifyBadge(formattedNumber);
        result = {
          documentType,
          holderName: maskName(zimsData.holderName),
          issueDate: zimsData.issueDate,
          expiryDate: zimsData.expiryDate,
          status: zimsData.status as DocumentStatus,
          documentNumber: zimsData.licenseNumber,
        };
        break;
      }
      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }

    await cacheSet(cacheKey, result, CACHE_TTL_VALID);
    return result;
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.code === 'ZIMS_NOT_FOUND') {
      await cacheSet(cacheKey, { notFound: true }, CACHE_TTL_NOT_FOUND);
      throw new NotFoundError('Document not found in ZIMS system');
    }
    throw err;
  }
}

function maskName(name: string): string {
  if (!name) return '***';
  const parts = name.split(' ');
  return parts.map((part, i) => {
    if (i === 0) return part;
    return part[0] + '***';
  }).join(' ');
}