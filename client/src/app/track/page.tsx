'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';
import { FilterPanel } from './filter-panel';
import { BusStopList } from './bus-stop-list';
import { DelayAlert } from './delay-alert';
import { PageHeader } from '@/components/ui/page-header';
import type { TrackingFilter, BusPosition } from '@zartsa/shared';

const BusMap = dynamic(() => import('./bus-map').then((mod) => mod.BusMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded-3xl border border-[#d4dadf] bg-[#f5f9f7]">
      <p className="text-sm text-[#637785]">Loading map...</p>
    </div>
  ),
});

export default function TrackPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<TrackingFilter>({});
  const [positions, setPositions] = useState<BusPosition[]>([]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('track.title')} backHref="/" />

      <div className="mb-4">
        <DelayAlert positions={positions} />
      </div>

      <div className="mb-4 rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(10,124,92,0.15)] border border-[#d4dadf]/50">
        <BusMap filter={filter} onPositionsUpdate={setPositions} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <FilterPanel filter={filter} onFilterChange={setFilter} />
        </div>
        <div className="md:col-span-2">
          <BusStopList />
        </div>
      </div>
    </div>
  );
}