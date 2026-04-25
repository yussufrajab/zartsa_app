'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatTZS } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  SHAMBA_DEPARTURES,
  SHAMBA_DESTINATIONS,
  DALADALA_DEPARTURES,
  DALADALA_DESTINATIONS,
} from '@zartsa/shared';
import type { RouteSearchResult } from '@zartsa/shared';

type RouteType = 'shamba' | 'daladala';

export default function TicketsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [routeType, setRouteType] = useState<RouteType>('shamba');
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [results, setResults] = useState<RouteSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');

  const departures = routeType === 'shamba' ? SHAMBA_DEPARTURES : DALADALA_DEPARTURES;
  const destinationsMap = routeType === 'shamba' ? SHAMBA_DESTINATIONS : DALADALA_DESTINATIONS;

  const destinationOptions = useMemo(() => {
    if (!departure || !destinationsMap[departure]) return [];
    return destinationsMap[departure];
  }, [departure, destinationsMap]);

  const today = new Date().toISOString().split('T')[0];

  const departureOptions = departures.map((d) => ({ value: d, label: d }));
  const destOptions = destinationOptions.map((d) => ({ value: d, label: d }));
  const passengerOptions = Array.from({ length: 5 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  const handleRouteTypeChange = (type: RouteType) => {
    setRouteType(type);
    setDeparture('');
    setDestination('');
    setResults([]);
    setHasSearched(false);
    setError('');
  };

  const handleDepartureChange = (value: string) => {
    setDeparture(value);
    setDestination('');
  };

  const handleSearch = async () => {
    if (!departure || !destination || !date) return;
    setIsLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        departure,
        destination,
        date: new Date(date).toISOString(),
      });
      const res = await api.get<{ data: RouteSearchResult[] }>(`/tickets/search?${params}`);
      setResults(res.data);
    } catch {
      setError(t('common.error'));
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectResult = (result: RouteSearchResult) => {
    const params = new URLSearchParams({
      departure: result.departure,
      destination: result.destination,
      date: new Date(date).toISOString(),
      passengers,
    });
    router.push(`/tickets/seats?${params}`);
  };

  const canSearch = departure && destination && date;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('tickets.title')} />

      {/* Route type toggle */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => handleRouteTypeChange('shamba')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            routeType === 'shamba'
              ? 'bg-[#0a7c5c] text-white'
              : 'bg-[#eaeef0] text-[#475a68] hover:bg-[#dfe5e8]'
          }`}
        >
          {t('tickets.shamba')}
        </button>
        <button
          onClick={() => handleRouteTypeChange('daladala')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            routeType === 'daladala'
              ? 'bg-[#0a7c5c] text-white'
              : 'bg-[#eaeef0] text-[#475a68] hover:bg-[#dfe5e8]'
          }`}
        >
          {t('tickets.daladala')}
        </button>
      </div>

      {/* Search form */}
      <Card size="default" className="mb-6">
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label={t('tickets.from')}
              options={departureOptions}
              placeholder={t('tickets.from')}
              value={departure}
              onChange={(e) => handleDepartureChange(e.target.value)}
            />
            <Select
              label={t('tickets.to')}
              options={destOptions}
              placeholder={departure ? t('tickets.to') : t('tickets.from') + '...'}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled={!departure}
            />
            <Input
              label={t('tickets.date')}
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Select
              label={t('tickets.passengers')}
              options={passengerOptions}
              value={passengers}
              onChange={(e) => setPassengers(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleSearch}
              loading={isLoading}
              disabled={!canSearch}
            >
              <Search className="mr-2 h-4 w-4" />
              {t('tickets.search')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-[#d4322c]/30 bg-[#fce8e7] p-3 text-sm text-[#d4322c]">
          {error}
        </div>
      )}

      {/* Empty state */}
      {hasSearched && !error && results.length === 0 && (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title={t('common.noResults')}
        />
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#0d1820]">{t('tickets.results')}</h2>
          {results.map((result, idx) => {
            const totalFare = result.totalFare * Number(passengers);
            return (
              <Card
                key={idx}
                variant="interactive"
                accentColor="green"
                onClick={() => handleSelectResult(result)}
              >
                <CardHeader>
                  <CardTitle>
                    {result.departure} → {result.destination}
                  </CardTitle>
                  <span className="text-sm font-medium text-[#0a7c5c]">
                    {t(`tickets.${routeType === 'shamba' ? 'shamba' : 'daladala'}`)}
                  </span>
                </CardHeader>
                <CardDescription>
                  {result.departureTime} → {result.estimatedArrival}
                </CardDescription>
                <CardContent className="mt-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs font-medium text-[#637885]">{t('tickets.totalAmount')}</p>
                      <p className="text-lg font-bold text-[#0d1820]">{formatTZS(totalFare)}</p>
                      <p className="text-xs text-[#637885]">
                        {formatTZS(result.totalFare)} x {passengers}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#637885]">{t('tickets.seatsAvailable')}</p>
                      <p className="text-lg font-bold text-[#0d1820]">{result.availableSeats}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="primary" size="sm">
                    {t('tickets.selectSeats')}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}