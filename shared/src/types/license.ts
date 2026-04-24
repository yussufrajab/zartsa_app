export type DocumentType =
  | 'driving_license'
  | 'road_license'
  | 'commercial_vehicle_license'
  | 'foreign_driving_permit'
  | 'government_driving_permit'
  | 'vehicle_visitor_permit'
  | 'temporary_permit'
  | 'driver_conductor_badge';

export type DocumentStatus = 'Valid' | 'Expired' | 'Suspended' | 'Invalid';

export interface VerificationResult {
  documentType: DocumentType;
  holderName: string;
  issueDate: string;
  expiryDate: string;
  status: DocumentStatus;
  documentNumber: string;
}

export interface VerificationRequest {
  documentType: DocumentType;
  number: string;
}