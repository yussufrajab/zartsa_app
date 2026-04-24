'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { formatTZS, formatDate } from '@/lib/utils';
import { DALADALA_DEPARTURES, SHAMBA_DEPARTURES, DALADALA_DESTINATIONS, SHAMBA_DESTINATIONS } from '@zartsa/shared';
import type { RouteType, FareSearchResult } from '@zartsa/shared';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

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
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/" className="rounded-md p-1 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{t('fare.title')}</h1>
      </div>

      {/* Route Type Toggle */}
      <div className="mb-4 flex overflow-hidden rounded-lg border">
        <button
          onClick={() => { setRouteType('daladala'); setDeparture(''); setDestination(''); setHasSearched(false); }}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${routeType === 'daladala' ? 'bg-zartsa-green text-white' : 'bg-white text-gray-700'}`}
        >
          {t('fare.daladala')}
        </button>
        <button
          onClick={() => { setRouteType('shamba'); setDeparture(''); setDestination(''); setHasSearched(false); }}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${routeType === 'shamba' ? 'bg-zartsa-green text-white' : 'bg-white text-gray-700'}`}
        >
          {t('fare.shamba')}
        </button>
      </div>

      {/* Search Form */}
      <div className="mb-6 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('fare.from')}</label>
          <select value={departure} onChange={(e) => { setDeparture(e.target.value); setDestination(''); }}
            className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="">{t('fare.from')}</option>
            {departures.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('fare.to')}</label>
          <select value={destination} onChange={(e) => setDestination(e.target.value)} disabled={!departure}
            className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50">
            <option value="">{t('fare.to')}</option>
            {destinations.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <button onClick={handleSearch} disabled={isSearching || !departure || !destination}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
          <Search className="h-4 w-4" />
          {t('fare.search')}
        </button>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">{t('fare.searchResults')}</h2>
          {isSearching ? (
            <p className="text-sm text-gray-500">{t('common.loading')}</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-500">{t('common.noResults')}</p>
          ) : (
            <div className="space-y-2">
              {results.map((f, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <p className="font-medium">{f.departure} &rarr; {f.destination}</p>
                  <div className="mt-1 space-y-0.5 text-sm text-gray-600">
                    <p>{t('fare.baseFare')}: {formatAmount(f.baseFare)}</p>
                    <p>{t('fare.surcharge')}: {formatAmount(f.surcharge)}</p>
                    <p className="font-semibold text-zartsa-green">{t('fare.total')}: {formatAmount(f.totalFare)}</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {t('fare.effectiveDate')}: {formatDate(f.effectiveDate, lang)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Fares Table */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">{routeType === 'daladala' ? t('fare.daladala') : t('fare.shamba')} &mdash; {t('fare.allFares')}</h2>
        {allFares.length === 0 ? (
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-1 pr-2">{t('fare.from')}</th>
                  <th className="pb-1 pr-2">{t('fare.to')}</th>
                  <th className="pb-1 pr-2 text-right">{t('fare.total')}</th>
                </tr>
              </thead>
              <tbody>
                {allFares.map((f, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-1.5 pr-2">{f.departure}</td>
                    <td className="py-1.5 pr-2">{f.destination}</td>
                    <td className="py-1.5 pr-2 text-right font-medium">{formatAmount(f.totalFare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}