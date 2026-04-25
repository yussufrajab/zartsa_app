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
      <div className="rounded-xl border border-[#d4dadf]/50 bg-[#f5f9f7] p-4">
        <p className="text-sm text-[#637785]">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#d4dadf]/50 bg-white/90 backdrop-blur-md p-4 shadow-md">
      <h3 className="mb-3 text-sm font-semibold text-[#0d1820]">
        <MapPin className="mr-1 inline h-4 w-4 text-[#0a7c5c]" />
        Bus Stops
      </h3>
      <div className="space-y-1">
        {stops.map((stop) => (
          <div key={stop.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#e6f4ef] cursor-pointer transition-colors">
            <div className="h-9 w-9 rounded-full bg-[#e6f4ef] flex items-center justify-center text-[#0a7c5c] flex-shrink-0">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <button
                onClick={() => setExpanded(expanded === stop.id ? null : stop.id)}
                className="flex w-full items-center justify-between text-left text-sm"
              >
                <div>
                  <p className="font-medium text-[#0d1820]">{lang === 'sw' ? stop.nameSw : stop.nameEn}</p>
                  <p className="text-xs text-[#637785]">{stop.servedRoutes.length} {t('track.route')}{stop.servedRoutes.length !== 1 ? 's' : ''}</p>
                </div>
                {expanded === stop.id ? (
                  <ChevronUp className="h-4 w-4 text-[#637785]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#637785]" />
                )}
              </button>
              {expanded === stop.id && (
                <div className="mt-2 border-t border-[#d4dadf]/50 pt-2">
                  <p className="mb-2 text-xs text-[#637785]">
                    {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                  </p>
                  <div className="space-y-1">
                    {stop.servedRoutes.map((route, idx) => (
                      <p key={idx} className="text-xs text-[#0d1820]">
                        {route}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}