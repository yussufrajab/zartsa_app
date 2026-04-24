'use client';

import { Marker, Tooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { useTranslation } from 'react-i18next';
import type { BusPosition } from '@zartsa/shared';

interface BusMarkerProps {
  position: BusPosition;
}

export function BusMarker({ position }: BusMarkerProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'sw' ? 'sw' : 'en';

  const markerIcon = divIcon({
    className: 'custom-bus-icon',
    html: `<div style="
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      color: white;
      background: ${position.isStale ? '#9ca3af' : position.serviceType === 'daladala' ? '#059669' : '#1d4ed8'};
      border: 2px solid ${position.isStale ? '#6b7280' : 'white'};
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      opacity: ${position.isStale ? '0.6' : '1'};
    ">${position.serviceType === 'daladala' ? 'D' : 'S'}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const recordedTime = new Date(position.recordedAt);
  const timeStr = recordedTime.toLocaleTimeString(lang === 'sw' ? 'sw-TZ' : 'en-TZ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Marker
      position={[position.latitude, position.longitude]}
      icon={markerIcon}
    >
      <Tooltip permanent={false}>
        <div className="text-xs">
          <p className="font-bold">{position.vehiclePlate}</p>
          <p>{position.route}</p>
          <p>{position.serviceType === 'daladala' ? t('fare.daladala') : t('fare.shamba')}</p>
          {position.speed !== null && <p>{Math.round(position.speed)} km/h</p>}
          <p className={position.isStale ? 'text-gray-500' : 'text-green-600'}>
            {position.isStale
              ? `${t('track.lastSeen')}: ${timeStr}`
              : `${t('track.liveMap')}: ${timeStr}`}
          </p>
        </div>
      </Tooltip>
    </Marker>
  );
}