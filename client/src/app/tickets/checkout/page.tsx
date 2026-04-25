'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '@/lib/api-client';
import { formatTZS, formatDate } from '@/lib/utils';
import { PAYMENT_METHODS } from '@zartsa/shared';
import type { PaymentMethod } from '@zartsa/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const MOBILE_METHODS: PaymentMethod[] = ['mpesa', 'airtel_money', 'zantel'];

function CheckoutContent() {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();

  const departure = searchParams.get('departure') || '';
  const destination = searchParams.get('destination') || '';
  const date = searchParams.get('date') || '';
  const passengers = Number(searchParams.get('passengers') || 1);
  const seats = searchParams.get('seats') || '';
  const totalFare = Number(searchParams.get('totalFare') || 0);

  const seatNumbers = seats ? seats.split(',') : [];

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const locale = i18n.language === 'sw' ? 'sw' : 'en';
  const totalAmount = totalFare * passengers;

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const body: {
        departure: string;
        destination: string;
        travelDate: string;
        passengerCount: number;
        seatNumbers: string[];
        paymentMethod: PaymentMethod;
        phoneNumber?: string;
      } = {
        departure,
        destination,
        travelDate: date,
        passengerCount: passengers,
        seatNumbers,
        paymentMethod,
      };

      if (MOBILE_METHODS.includes(paymentMethod)) {
        body.phoneNumber = phoneNumber;
      }

      const res = await api.post<{ data: { id: string } }>('/tickets', body);
      router.push(`/tickets/confirmation?id=${res.data.id}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('common.error');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const backParams = new URLSearchParams({
    departure,
    destination,
    date,
    passengers: String(passengers),
    seats,
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
      <PageHeader
        title={t('tickets.checkout')}
        subtitle={`${departure} → ${destination}`}
        backHref={`/tickets/seats?${backParams.toString()}`}
      />

      {/* Booking summary */}
      <Card size="default" className="mb-6">
        <CardContent className="space-y-3">
          <h3 className="font-display text-base font-semibold text-[#0d1820]">
            {t('tickets.route')}
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-medium text-[#637885]">{t('tickets.from')}</p>
              <p className="font-medium text-[#0d1820]">{departure}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#637885]">{t('tickets.to')}</p>
              <p className="font-medium text-[#0d1820]">{destination}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#637885]">{t('tickets.date')}</p>
              <p className="font-medium text-[#0d1820]">{formatDate(date, locale)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#637885]">{t('tickets.passengers')}</p>
              <p className="font-medium text-[#0d1820]">{passengers}</p>
            </div>
          </div>
          <div className="text-sm">
            <p className="text-xs font-medium text-[#637885]">{t('tickets.seat')}</p>
            <p className="font-medium text-[#0d1820]">{seatNumbers.join(', ')}</p>
          </div>

          <div className="rounded-xl bg-[#f5f9f7] p-3 text-center">
            <p className="text-xs font-medium text-[#637885]">{t('tickets.totalAmount')}</p>
            <p className="text-2xl font-bold text-[#0d1820]">{formatTZS(totalAmount)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment method selection */}
      <div className="mb-6 space-y-2">
        <p className="text-sm font-medium text-[#2e3f4c]">{t('tickets.selectPaymentMethod')}</p>
        <div className="space-y-2">
          {PAYMENT_METHODS.map((method) => (
            <label
              key={method}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors cursor-pointer ${
                paymentMethod === method
                  ? 'border-[#0a7c5c] bg-[#e6f4ef]'
                  : 'border-[#d4dadf] bg-white hover:border-[#b0bcc5]'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method}
                checked={paymentMethod === method}
                onChange={() => setPaymentMethod(method)}
                className="h-4 w-4 accent-[#0a7c5c]"
              />
              <span className="text-sm font-medium text-[#0d1820]">
                {t(`fines.paymentMethods.${method}`)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Phone number for mobile money methods */}
      {MOBILE_METHODS.includes(paymentMethod) && (
        <div className="mb-6">
          <Input
            label={t('auth.phone')}
            type="tel"
            placeholder="07XX XXX XXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-[#d4322c]/30 bg-[#fce8e7] p-3 text-sm text-[#d4322c]">
          {error}
        </div>
      )}

      {/* Confirm button */}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        loading={isSubmitting}
        onClick={handleSubmit}
      >
        {t('tickets.confirmPayment')}
      </Button>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0a7c5c] border-t-transparent" />
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}