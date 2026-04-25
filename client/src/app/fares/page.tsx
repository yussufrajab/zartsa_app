'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { formatTZS, formatDate } from '@/lib/utils';
import { DALADALA_DEPARTURES, SHAMBA_DEPARTURES, DALADALA_DESTINATIONS, SHAMBA_DESTINATIONS } from '@zartsa/shared';
import type { RouteType, FareSearchResult } from '@zartsa/shared';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function FaresPage() {
  const { t, i18n } = useTranslation();
  const [routeType, setRouteType] = useState<RouteType>('daladala');
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [results, setResults] = useState<FareSearchResult[]>([]);
  const [allFares, setAllFares] = useState<FareSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const departures = routeType === 'daladala' ? DALADALA_DEPARTURES : SHAMBA_DEPARTURES;
  const destinationsMap = routeType === 'daladala' ? DALADALA_DESTINATIONS : SHAMBA_DESTINATIONS;
  const destinations = departure ? (destinationsMap[departure] ?? []) : [];

  useEffect(() => {
    api.get<{ data: FareSearchResult[] }>(`/fares?routeType=${routeType}`)
      .then((res) => setAllFares(res.data))
      .catch(() => setAllFares([]));
  }, [routeType]);

  const handleSearch = async () => {
    if (!departure || !destination) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await api.get<{ data: FareSearchResult[] }>(
        `/fares/search?routeType=${routeType}&departure=${encodeURIComponent(departure)}&destination=${encodeURIComponent(destination)}`
      );
      setResults(res.data);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const formatAmount = (amount: number) => formatTZS(amount);
  const lang = i18n.language as 'sw' | 'en';

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('fare.title')} subtitle={t('app.tagline')} backHref="/" />

      {/* Route Type Toggle */}
      <div className="mb-6 flex overflow-hidden rounded-xl border border-[#d4dadf]">
        <button
          onClick={() => { setRouteType('daladala'); setDeparture(''); setDestination(''); setHasSearched(false); }}
          className={cn('flex-1 py-2.5 text-sm font-medium transition-all', routeType === 'daladala' ? 'bg-[#0a7c5c] text-white' : 'bg-white text-[#637785] hover:bg-[#e6f4ef]')}
        >
          {t('fare.daladala')}
        </button>
        <button
          onClick={() => { setRouteType('shamba'); setDeparture(''); setDestination(''); setHasSearched(false); }}
          className={cn('flex-1 py-2.5 text-sm font-medium transition-all', routeType === 'shamba' ? 'bg-[#1a5f8a] text-white' : 'bg-white text-[#637785] hover:bg-[#e6f4ef]')}
        >
          {t('fare.shamba')}
        </button>
      </div>

      {/* Search Form */}
      <div className="mb-6 bg-gradient-to-b from-[#e6f4ef] to-[#f5f9f7] rounded-2xl p-6">
        <div className="space-y-4 md:flex md:items-end md:gap-4 md:space-y-0">
          <div className="flex-1">
            <Select label={t('fare.from')} value={departure}
              onChange={(e) => { setDeparture(e.target.value); setDestination(''); }}
              options={departures.map((d) => ({ value: d, label: d }))}
              placeholder={t('fare.from')} />
          </div>
          <div className="flex-1">
            <Select label={t('fare.to')} value={destination}
              onChange={(e) => setDestination(e.target.value)} disabled={!departure}
              options={destinations.map((d) => ({ value: d, label: d }))}
              placeholder={t('fare.to')} />
          </div>
          <Button onClick={handleSearch} loading={isSearching} disabled={!departure || !destination}
            className="w-full md:w-auto">
            <Search className="h-4 w-4" />
            {t('fare.search')}
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-[#0d1820]">{t('fare.searchResults')}</h2>
          {isSearching ? (
            <div className="space-y-2">
              <div className="h-16 rounded-xl skeleton-shimmer" />
              <div className="h-16 rounded-xl skeleton-shimmer" />
            </div>
          ) : results.length === 0 ? (
            <Card variant="gradient" accentColor="red" size="compact">
              <p className="text-sm text-[#637785]">{t('common.noResults')}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {results.map((f, i) => (
                <Card key={i} variant="gradient" accentColor="gold" size="compact" className={routeType === 'daladala' ? 'border-l-4 border-l-[#0a7c5c]' : 'border-l-4 border-l-[#1a5f8a]'}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-[#0d1820]">{f.departure} &rarr; {f.destination}</p>
                      <div className="mt-1 space-y-0.5 text-sm text-[#637785]">
                        <p>{t('fare.baseFare')}: {formatAmount(f.baseFare)}</p>
                        <p>{t('fare.surcharge')}: {formatAmount(f.surcharge)}</p>
                      </div>
                    </div>
                    <span className="font-display text-2xl font-bold text-[#0a7c5c]">{formatAmount(f.totalFare)}</span>
                  </div>
                  <p className="mt-2 text-xs text-[#637785]">
                    {t('fare.effectiveDate')}: {formatDate(f.effectiveDate, lang)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Fares Table */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[#0d1820]">
          {routeType === 'daladala' ? t('fare.daladala') : t('fare.shamba')} &mdash; {t('fare.allFares')}
        </h2>
        {allFares.length === 0 ? (
          <div className="h-32 rounded-xl skeleton-shimmer" />
        ) : (
          <Card size="compact">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#d4dadf] text-left text-xs text-[#637785]">
                    <th className="pb-2 pr-2 font-medium">{t('fare.from')}</th>
                    <th className="pb-2 pr-2 font-medium">{t('fare.to')}</th>
                    <th className="pb-2 pr-2 text-right font-medium">{t('fare.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {allFares.map((f, i) => (
                    <tr key={i} className="border-b border-[#d4dadf]/50 last:border-0">
                      <td className="py-2 pr-2 text-[#0d1820]">{f.departure}</td>
                      <td className="py-2 pr-2 text-[#0d1820]">{f.destination}</td>
                      <td className="py-2 text-right font-medium text-primary">{formatAmount(f.totalFare)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}