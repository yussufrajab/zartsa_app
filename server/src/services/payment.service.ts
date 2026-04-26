// server/src/services/payment.service.ts
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import type { PaymentMethod } from '@zartsa/shared';

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  phoneNumber?: string;
  controlNumber: string;
  description: string;
}

export interface PaymentResult {
  success: boolean;
  transactionRef: string;
  paidAt: Date;
  message: string;
}

export async function processPayment(request: PaymentRequest): Promise<PaymentResult> {
  const transactionRef = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  logger.info('Payment processed (mock)', {
    transactionRef,
    amount: request.amount,
    method: request.paymentMethod,
    controlNumber: request.controlNumber,
  });

  if (env.NODE_ENV === 'production') {
    throw new AppError(501, 'Payment gateway not configured for production', 'PAYMENT_NOT_CONFIGURED');
  }

  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // In development, always succeed
  return {
    success: true,
    transactionRef,
    paidAt: new Date(),
    message: `Payment of ${request.currency} ${request.amount.toLocaleString()} via ${request.paymentMethod} successful`,
  };
}

export async function refundPayment(transactionRef: string, amount: number): Promise<boolean> {
  logger.info('Refund processed (mock)', { transactionRef, amount });
  return true;
}