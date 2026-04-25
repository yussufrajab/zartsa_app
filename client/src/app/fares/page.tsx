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
      <div className="mb-6 flex overflow-hidden rounded-lg border border-slate-200">
        <button
          onClick={() => { setRouteType('daladala'); setDeparture(''); setDestination(''); setHasSearched(false); }}
          className={cn('flex-1 py-2.5 text-sm font-medium transition-all', routeType === 'daladala' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
        >
          {t('fare.daladala')}
        </button>
        <button
          onClick={() => { setRouteType('shamba'); setDeparture(''); setDestination(''); setHasSearched(false); }}
          className={cn('flex-1 py-2.5 text-sm font-medium transition-all', routeType === 'shamba' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
        >
          {t('fare.shamba')}
        </button>
      </div>

      {/* Search Form */}
      <Card size="default" className="mb-6">
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
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">{t('fare.searchResults')}</h2>
          {isSearching ? (
            <div className="space-y-2">
              <div className="h-16 rounded-xl skeleton-shimmer" />
              <div className="h-16 rounded-xl skeleton-shimmer" />
            </div>
          ) : results.length === 0 ? (
            <Card variant="gradient" accentColor="red" size="compact">
              <p className="text-sm text-slate-500">{t('common.noResults')}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {results.map((f, i) => (
                <Card key={i} variant="gradient" accentColor="gold" size="compact">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{f.departure} &rarr; {f.destination}</p>
                      <div className="mt-1 space-y-0.5 text-sm text-slate-500">
                        <p>{t('fare.baseFare')}: {formatAmount(f.baseFare)}</p>
                        <p>{t('fare.surcharge')}: {formatAmount(f.surcharge)}</p>
                      </div>
                    </div>
                    <Badge variant="gold">{formatAmount(f.totalFare)}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
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
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          {routeType === 'daladala' ? t('fare.daladala') : t('fare.shamba')} &mdash; {t('fare.allFares')}
        </h2>
        {allFares.length === 0 ? (
          <div className="h-32 rounded-xl skeleton-shimmer" />
        ) : (
          <Card size="compact">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="pb-2 pr-2 font-medium">{t('fare.from')}</th>
                    <th className="pb-2 pr-2 font-medium">{t('fare.to')}</th>
                    <th className="pb-2 pr-2 text-right font-medium">{t('fare.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {allFares.map((f, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-2 text-slate-700">{f.departure}</td>
                      <td className="py-2 pr-2 text-slate-700">{f.destination}</td>
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