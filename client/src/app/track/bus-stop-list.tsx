'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import type { BusStop } from '@zartsa/shared';

export function BusStopList() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'sw' ? 'sw' : 'en';
  const [stops, setStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStops() {
      try {
        const response = await api.get<{ status: string; data: BusStop[] }>('/tracking/stops');
        setStops(response.data);
      } catch {
        setStops([]);
      } finally {
        setLoading(false);
      }
    }
    fetchStops();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border p-4">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">
        <MapPin className="mr-1 inline h-4 w-4 text-zartsa-green" />
        Bus Stops
      </h3>
      <div className="space-y-1">
        {stops.map((stop) => (
          <div key={stop.id} className="rounded-md border">
            <button
              onClick={() => setExpanded(expanded === stop.id ? null : stop.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <div>
                <p className="font-medium">{lang === 'sw' ? stop.nameSw : stop.nameEn}</p>
                <p className="text-xs text-gray-500">{stop.servedRoutes.length} {t('track.route')}{stop.servedRoutes.length !== 1 ? 's' : ''}</p>
              </div>
              {expanded === stop.id ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {expanded === stop.id && (
              <div className="border-t px-3 py-2">
                <p className="mb-2 text-xs text-gray-500">
                  {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                </p>
                <div className="space-y-1">
                  {stop.servedRoutes.map((route, idx) => (
                    <p key={idx} className="text-xs text-gray-600">
                      {route}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}