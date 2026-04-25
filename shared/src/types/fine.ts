export type FinePaymentStatus = 'OUTSTANDING' | 'PAID' | 'DISPUTED' | 'WAIVED';

export type PaymentMethod = 'mpesa' | 'airtel_money' | 'zantel' | 'visa' | 'mastercard' | 'bank_transfer';

export interface Fine {
  id: string;
  drivingLicense: string | null;
  vehiclePlate: string | null;
  offenseType: string;
  offenseDate: string;
  location: string;
  penaltyAmount: number;
  currency: string;
  controlNumber: string;
  paymentStatus: FinePaymentStatus;
  paymentRef: string | null;
  paidAt: string | null;
  zimsSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReceipt {
  transactionRef: string;
  fineId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paidAt: string;
  controlNumber: string;
}