'use client';

import { useTranslation } from 'react-i18next';
import type { TrackingFilter } from '@zartsa/shared';
import { Filter, X } from 'lucide-react';

interface FilterPanelProps {
  filter: TrackingFilter;
  onFilterChange: (filter: TrackingFilter) => void;
}

export function FilterPanel({ filter, onFilterChange }: FilterPanelProps) {
  const { t } = useTranslation();

  const hasActiveFilter = Boolean(filter.route || filter.operatorId || filter.serviceType);

  const handleClear = () => {
    onFilterChange({});
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-md border border-[#d4dadf]/50 mb-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#637785]" />
          <h3 className="text-sm font-semibold text-[#0d1820]">{t('track.filter')}</h3>
        </div>
        {hasActiveFilter && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-[#c8730a] hover:text-[#a55f08]"
          >
            <X className="h-3 w-3" />
            {t('common.cancel')}
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-[#637785]">{t('track.route')}</label>
          <input
            type="text"
            value={filter.route || ''}
            onChange={(e) => onFilterChange({ ...filter, route: e.target.value || undefined })}
            placeholder="Stone Town - Fuoni"
            className="w-full rounded-md border border-[#d4dadf] px-3 py-2 text-sm bg-[#f5f9f7] focus:border-[#0a7c5c] focus:ring-1 focus:ring-[#0a7c5c]/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-[#637785]">{t('track.operator')}</label>
          <input
            type="text"
            value={filter.operatorId || ''}
            onChange={(e) => onFilterChange({ ...filter, operatorId: e.target.value || undefined })}
            placeholder={t('track.operator')}
            className="w-full rounded-md border border-[#d4dadf] px-3 py-2 text-sm bg-[#f5f9f7] focus:border-[#0a7c5c] focus:ring-1 focus:ring-[#0a7c5c]/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-[#637785]">{t('track.serviceType')}</label>
          <select
            value={filter.serviceType || ''}
            onChange={(e) => onFilterChange({
              ...filter,
              serviceType: (e.target.value as 'daladala' | 'shamba' | '') || undefined,
            })}
            className="w-full rounded-md border border-[#d4dadf] px-3 py-2 text-sm bg-[#f5f9f7] focus:border-[#0a7c5c] focus:ring-1 focus:ring-[#0a7c5c]/20"
          >
            <option value="">{t('common.search')}</option>
            <option value="daladala">{t('fare.daladala')}</option>
            <option value="shamba">{t('fare.shamba')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}