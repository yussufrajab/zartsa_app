'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '@/lib/api-client';
import { formatTZS, formatDate } from '@/lib/utils';
import { CheckCircle, Home, TicketCheck } from 'lucide-react';
import Link from 'next/link';
import type { Booking } from '@zartsa/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

function ConfirmationContent() {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const locale = i18n.language === 'sw' ? 'sw' : 'en';

  useEffect(() => {
    if (!id) {
      setError(t('common.error'));
      setIsLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        const res = await api.get<{ data: Booking }>(`/tickets/${id}`);
        setBooking(res.data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError(t('common.noResults'));
        } else {
          setError(t('common.error'));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [id, t]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0a7c5c] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
        <PageHeader title={t('tickets.checkout')} backHref="/tickets" />
        <div className="rounded-xl border border-[#d4322c]/30 bg-[#fce8e7] p-3 text-sm text-[#d4322c]">
          {error || t('common.error')}
        </div>
      </div>
    );
  }

  const qrImageUrl = `/api/tickets/${booking.id}/qr`;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
      {/* Green confirmation banner */}
      <div className="mb-6 rounded-2xl border border-[#0a7c5c]/20 bg-[#e6f4ef] p-6 text-center">
        <CheckCircle className="mx-auto mb-3 h-12 w-12 text-[#0a7c5c]" />
        <h2 className="font-display text-xl font-semibold text-[#0a7c5c]">
          {t('tickets.bookingConfirmed')}
        </h2>
      </div>

      {/* Booking details */}
      <Card size="default" className="mb-6">
        <CardContent className="space-y-3">
          <h3 className="font-display text-base font-semibold text-[#0d1820]">
            {t('tickets.route')}
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-medium text-[#637885]">{t('tickets.from')}</p>
              <p className="font-medium text-[#0d1820]">{booking.departure}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#637885]">{t('tickets.to')}</p>
              <p className="font-medium text-[#0d1820]">{booking.destination}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#637885]">{t('tickets.date')}</p>
              <p className="font-medium text-[#0d1820]">{formatDate(booking.travelDate, locale)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#637885]">{t('tickets.seat')}</p>
              <p className="font-medium text-[#0d1820]">{booking.seatNumbers.join(', ')}</p>
            </div>
          </div>

          <div className="rounded-xl bg-[#f5f9f7] p-3 text-center">
            <p className="text-xs font-medium text-[#637885]">{t('tickets.totalAmount')}</p>
            <p className="text-2xl font-bold text-[#0d1820]">{formatTZS(booking.totalAmount)}</p>
          </div>
        </CardContent>
      </Card>

      {/* QR Code section */}
      <Card size="default" className="mb-6">
        <CardContent className="flex flex-col items-center gap-3 py-6">
          <h3 className="font-display text-base font-semibold text-[#0d1820]">
            {t('tickets.qrCode')}
          </h3>
          <img
            src={qrImageUrl}
            alt="QR Code"
            className="h-48 w-48 rounded-xl border border-[#d4dadf]/60"
          />
          {booking.qrCode && (
            <p className="font-mono text-xs text-[#637885] break-all text-center max-w-xs">
              {booking.qrCode}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Navigation links */}
      <div className="flex flex-col gap-3">
        <Link
          href="/tickets/my"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#0a7c5c] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#085a43]"
        >
          <TicketCheck className="h-4 w-4" />
          {t('tickets.myBookings')}
        </Link>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#0a7c5c] px-5 py-3 text-sm font-semibold text-[#0a7c5c] transition-colors hover:bg-[#e6f4ef]"
        >
          <Home className="h-4 w-4" />
          {t('common.back')}
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
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
      <ConfirmationContent />
    </Suspense>
  );
}