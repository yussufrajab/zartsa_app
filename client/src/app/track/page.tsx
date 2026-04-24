'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BusMap } from './bus-map';
import { FilterPanel } from './filter-panel';
import { BusStopList } from './bus-stop-list';
import { DelayAlert } from './delay-alert';
import type { TrackingFilter, BusPosition } from '@zartsa/shared';

export default function TrackPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<TrackingFilter>({});
  const [positions, setPositions] = useState<BusPosition[]>([]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">{t('track.title')}</h1>

      <div className="mb-4">
        <DelayAlert positions={positions} />
      </div>

      <div className="mb-4">
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