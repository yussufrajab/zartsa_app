'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '@/lib/api-client';
import { formatTZS, formatDate } from '@/lib/utils';
import { ArrowLeft, TicketCheck, X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Booking, TicketStatus } from '@zartsa/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

const statusVariant: Record<TicketStatus, 'success' | 'error' | 'info' | 'neutral'> = {
  ACTIVE: 'success',
  CANCELLED: 'error',
  USED: 'info',
  EXPIRED: 'neutral',
};

const statusLabelKey: Record<TicketStatus, string> = {
  ACTIVE: 'tickets.active',
  CANCELLED: 'tickets.cancelled',
  USED: 'tickets.used',
  EXPIRED: 'tickets.expired',
};

export default function MyBookingsPage() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const locale = i18n.language === 'sw' ? 'sw' : 'en';

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchBookings = async () => {
      try {
        const res = await api.get<{ data: Booking[] }>('/tickets/my');
        setBookings(res.data);
      } catch {
        setError(t('common.error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [isAuthenticated, authLoading, router, t]);

  const handleCancel = async (bookingId: string) => {
    const confirmed = window.confirm(t('tickets.cancelBooking') + '?');
    if (!confirmed) return;

    setCancellingId(bookingId);
    try {
      await api.post(`/tickets/${bookingId}/cancel`, {});
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: 'CANCELLED' as TicketStatus } : b
        )
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('common.error');
      alert(message);
    } finally {
      setCancellingId(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
        <PageHeader title={t('tickets.myBookings')} backHref="/" />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0a7c5c] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
        <PageHeader title={t('tickets.myBookings')} backHref="/" />
        <div className="rounded-xl border border-[#d4322c]/30 bg-[#fce8e7] p-3 text-sm text-[#d4322c]">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('tickets.myBookings')} backHref="/" />

      {bookings.length === 0 ? (
        <EmptyState
          icon={<TicketCheck className="h-12 w-12" />}
          title={t('common.noResults')}
          description={t('tickets.search')}
          actionLabel={t('tickets.title')}
          onAction={() => router.push('/tickets')}
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card
              key={booking.id}
              variant="gradient"
              accentColor={
                statusVariant[booking.status] === 'success'
                  ? 'green'
                  : statusVariant[booking.status] === 'error'
                    ? 'red'
                    : statusVariant[booking.status] === 'info'
                      ? 'blue'
                      : 'blue'
              }
            >
              <CardHeader>
                <CardTitle>
                  {booking.departure} → {booking.destination}
                </CardTitle>
                <Badge variant={statusVariant[booking.status]}>
                  {t(statusLabelKey[booking.status])}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-[#637885]">{t('tickets.date')}</p>
                    <p className="font-medium text-[#0d1820]">{formatDate(booking.travelDate, locale)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#637885]">{t('tickets.seat')}</p>
                    <p className="font-medium text-[#0d1820]">{booking.seatNumbers.join(', ')}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-[#0d1820]">{formatTZS(booking.totalAmount)}</p>
                  {booking.status === 'ACTIVE' && (
                    <Button
                      variant="danger"
                      size="sm"
                      loading={cancellingId === booking.id}
                      onClick={() => handleCancel(booking.id)}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      {t('tickets.cancelBooking')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}