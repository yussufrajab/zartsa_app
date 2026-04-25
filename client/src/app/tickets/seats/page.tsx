'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Bus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { SeatInfo, SeatLayout } from '@zartsa/shared';

function SeatSelectionContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();

  const departure = searchParams.get('departure') || '';
  const destination = searchParams.get('destination') || '';
  const date = searchParams.get('date') || '';
  const passengers = Number(searchParams.get('passengers') || 1);
  const totalFare = Number(searchParams.get('totalFare') || 0);

  const [seatLayout, setSeatLayout] = useState<SeatLayout | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchSeats() {
      if (!departure || !destination || !date) {
        setError(t('common.error'));
        setIsLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams({ departure, destination, date });
        const res = await api.get<{ data: SeatLayout }>(`/tickets/seats?${params}`);
        setSeatLayout(res.data);
      } catch {
        setError(t('common.error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchSeats();
  }, [departure, destination, date, t]);

  const toggleSeat = useCallback(
    (seat: SeatInfo) => {
      if (!seat.isAvailable) return;

      setSelectedSeats((prev) => {
        if (prev.includes(seat.number)) {
          return prev.filter((s) => s !== seat.number);
        }
        if (prev.length >= passengers) return prev;
        return [...prev, seat.number];
      });
    },
    [passengers]
  );

  const handleContinue = () => {
    const params = new URLSearchParams({
      departure,
      destination,
      date,
      passengers: String(passengers),
      seats: selectedSeats.join(','),
      totalFare: String(totalFare),
    });
    router.push(`/tickets/checkout?${params}`);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
        <PageHeader title={t('tickets.selectSeats')} backHref="/tickets" />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0a7c5c] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !seatLayout) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
        <PageHeader title={t('tickets.selectSeats')} backHref="/tickets" />
        <div className="rounded-xl border border-[#d4322c]/30 bg-[#fce8e7] p-3 text-sm text-[#d4322c]">
          {error || t('common.noResults')}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader
        title={t('tickets.selectSeats')}
        subtitle={`${departure} → ${destination}`}
        backHref="/tickets"
      />

      {/* Seat map legend */}
      <Card size="compact" className="mb-6">
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#475a68]">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-5 w-5 rounded-md border-2 border-[#d4dadf] bg-white" />
              {t('tickets.standard')}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-5 w-5 rounded-md border-2 border-amber-500 bg-white" />
              {t('tickets.premium')}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-5 w-5 rounded-md border-2 border-[#0a7c5c] bg-[#0a7c5c]" />
              {t('tickets.selected')}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-5 w-5 rounded-md border-2 border-[#d4dadf] bg-[#eaeef0]" />
              {t('tickets.occupied')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bus layout */}
      <Card size="default" className="mb-6">
        <CardContent>
          {/* Front indicator */}
          <div className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold text-[#637885]">
            <Bus className="h-4 w-4" />
            {t('tickets.seat')} — Front
          </div>

          {/* Seat grid */}
          <div className="mx-auto max-w-xs space-y-2">
            {seatLayout.layout.map((row, rowIdx) => (
              <div key={rowIdx} className="flex items-center justify-center gap-2">
                {/* Left pair: seats 0 and 1 */}
                {row.slice(0, 2).map((seat) => (
                  <SeatButton
                    key={seat.number}
                    seat={seat}
                    isSelected={selectedSeats.includes(seat.number)}
                    onSelect={toggleSeat}
                  />
                ))}

                {/* Aisle gap */}
                <div className="w-6" />

                {/* Right pair: seats 2 and 3 */}
                {row.slice(2, 4).map((seat) => (
                  <SeatButton
                    key={seat.number}
                    seat={seat}
                    isSelected={selectedSeats.includes(seat.number)}
                    onSelect={toggleSeat}
                  />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected seats counter and continue */}
      <div className="sticky bottom-4 z-10 mx-auto max-w-5xl">
        <Card size="compact" className="shadow-lg">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#637885]">
                  {selectedSeats.length}/{passengers} {t('tickets.seat').toLowerCase()}{passengers !== 1 ? 's' : ''}
                </p>
                {selectedSeats.length > 0 && (
                  <p className="text-sm font-semibold text-[#0d1820]">
                    {selectedSeats.join(', ')}
                  </p>
                )}
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleContinue}
                disabled={selectedSeats.length !== passengers}
              >
                {t('tickets.next')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SeatButton({
  seat,
  isSelected,
  onSelect,
}: {
  seat: SeatInfo;
  isSelected: boolean;
  onSelect: (seat: SeatInfo) => void;
}) {
  const isPremium = seat.type === 'premium';
  const isOccupied = !seat.isAvailable;

  let seatClass =
    'flex h-10 w-10 items-center justify-center rounded-lg border-2 text-xs font-semibold transition-all duration-150 select-none';

  if (isOccupied) {
    seatClass += ' cursor-not-allowed border-[#d4dadf] bg-[#eaeef0] text-[#9aa8b3]';
  } else if (isSelected) {
    seatClass += ' cursor-pointer border-[#0a7c5c] bg-[#0a7c5c] text-white shadow-md';
  } else if (isPremium) {
    seatClass += ' cursor-pointer border-amber-500 bg-white text-amber-700 hover:bg-amber-50';
  } else {
    seatClass += ' cursor-pointer border-[#d4dadf] bg-white text-[#475a68] hover:border-[#0a7c5c]/40 hover:bg-[#e6f4ef]';
  }

  return (
    <button
      type="button"
      className={seatClass}
      disabled={isOccupied}
      onClick={() => onSelect(seat)}
      aria-label={`Seat ${seat.number}${isOccupied ? ' occupied' : isSelected ? ' selected' : ''}${isPremium ? ' premium' : ''}`}
    >
      {seat.number}
    </button>
  );
}

export default function SeatSelectionPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0a7c5c] border-t-transparent" />
          </div>
        </div>
      }
    >
      <SeatSelectionContent />
    </Suspense>
  );
}