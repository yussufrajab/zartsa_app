'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { formatTZS, formatDate } from '@/lib/utils';
import { ArrowLeft, Search, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { Fine, FinePaymentStatus } from '@zartsa/shared';

const statusVariant: Record<FinePaymentStatus, 'error' | 'success' | 'warning' | 'neutral'> = {
  OUTSTANDING: 'error',
  PAID: 'success',
  DISPUTED: 'warning',
  WAIVED: 'neutral',
};

export default function FinesPage() {
  const { t, i18n } = useTranslation();
  const [searchMode, setSearchMode] = useState<'license' | 'plate'>('license');
  const [query, setQuery] = useState('');
  const [fines, setFines] = useState<Fine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const param = searchMode === 'license'
        ? `drivingLicense=${encodeURIComponent(query.trim())}`
        : `vehiclePlate=${encodeURIComponent(query.trim())}`;
      const res = await api.get<{ data: Fine[] }>(`/fines?${param}`);
      setFines(res.data);
    } catch {
      setError(t('common.error'));
      setFines([]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyControlNumber = (id: string, controlNumber: string) => {
    navigator.clipboard.writeText(controlNumber);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusLabel = (status: FinePaymentStatus) => {
    const key = `fines.status.${status.toLowerCase()}` as const;
    return t(key);
  };

  const locale = i18n.language === 'sw' ? 'sw' : 'en';

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('fines.title')} />

      {/* Search toggle */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => { setSearchMode('license'); setQuery(''); setHasSearched(false); }}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            searchMode === 'license'
              ? 'bg-[#0a7c5c] text-white'
              : 'bg-[#eaeef0] text-[#475a68] hover:bg-[#dfe5e8]'
          }`}
        >
          {t('fines.byLicense')}
        </button>
        <button
          onClick={() => { setSearchMode('plate'); setQuery(''); setHasSearched(false); }}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            searchMode === 'plate'
              ? 'bg-[#0a7c5c] text-white'
              : 'bg-[#eaeef0] text-[#475a68] hover:bg-[#dfe5e8]'
          }`}
        >
          {t('fines.byPlate')}
        </button>
      </div>

      {/* Search input */}
      <div className="flex gap-2">
        <Input
          placeholder={searchMode === 'license' ? t('fines.licensePlaceholder') : t('fines.platePlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          icon={<Search className="h-4 w-4" />}
        />
        <Button variant="primary" onClick={handleSearch} loading={isLoading}>
          {t('common.search')}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl border border-[#d4322c]/30 bg-[#fce8e7] p-3 text-sm text-[#d4322c]">
          {error}
        </div>
      )}

      {/* Empty state */}
      {hasSearched && !error && fines.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={<Search className="h-12 w-12" />}
            title={t('fines.noFines')}
          />
        </div>
      )}

      {/* Results */}
      {fines.length > 0 && (
        <div className="mt-6 space-y-4">
          {fines.map((fine) => (
            <Link key={fine.id} href={`/fines/${fine.id}`}>
              <Card variant="interactive" accentColor={statusVariant[fine.paymentStatus] === 'success' ? 'green' : statusVariant[fine.paymentStatus] === 'warning' ? 'gold' : statusVariant[fine.paymentStatus] === 'error' ? 'red' : 'blue'} size="default">
                <CardHeader>
                  <CardTitle>{fine.offenseType}</CardTitle>
                  <Badge variant={statusVariant[fine.paymentStatus]}>
                    {statusLabel(fine.paymentStatus)}
                  </Badge>
                </CardHeader>
                <CardDescription>
                  {formatDate(fine.offenseDate, locale)}
                </CardDescription>
                <CardContent className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs font-medium text-[#637885]">{t('fines.offenseType')}</p>
                      <p className="font-medium text-[#0d1820]">{fine.offenseType}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#637885]">{t('fines.location')}</p>
                      <p className="font-medium text-[#0d1820]">{fine.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-[#0d1820]">{formatTZS(fine.penaltyAmount)}</p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        copyControlNumber(fine.id, fine.controlNumber);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-[#f5f9f7] px-3 py-1.5 text-xs font-medium text-[#0a7c5c] transition-colors hover:bg-[#e6f4ef]"
                    >
                      <span className="font-mono">{fine.controlNumber}</span>
                      {copiedId === fine.id ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}