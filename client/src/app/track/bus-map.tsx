'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer } from 'react-leaflet';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api-client';
import { BusMarker } from './bus-marker';
import type { BusPosition, TrackingFilter } from '@zartsa/shared';

interface BusMapProps {
  filter: TrackingFilter;
  onPositionsUpdate?: (positions: BusPosition[]) => void;
}

const ZANZIBAR_CENTER: [number, number] = [-6.1659, 39.1989];
const DEFAULT_ZOOM = 12;
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function BusMap({ filter, onPositionsUpdate }: BusMapProps) {
  const { t } = useTranslation();
  const [positions, setPositions] = useState<BusPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    async function fetchPositions() {
      try {
        const params = new URLSearchParams();
        if (filter.route) params.set('route', filter.route);
        if (filter.operatorId) params.set('operatorId', filter.operatorId);
        if (filter.serviceType) params.set('serviceType', filter.serviceType);

        const response = await api.get<{ status: string; data: BusPosition[] }>(
          `/tracking/buses?${params.toString()}`
        );
        setPositions(response.data);
      } catch {
        // Will show empty map
      } finally {
        setLoading(false);
      }
    }
    fetchPositions();
  }, [filter]);

  useEffect(() => {
    const socketIo = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketIo.on('connect', () => {
      console.log('[Tracking] Socket connected');
    });

    socketIo.on('bus:update', (update: BusPosition) => {
      setPositions((prev) => {
        const index = prev.findIndex((p) => p.vehiclePlate === update.vehiclePlate);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = update;
          return updated;
        }
        return [...prev, update];
      });
    });

    socketIo.on('delay:alert', (alert: { vehiclePlate: string; route: string; delayMinutes: number }) => {
      console.log('[Tracking] Delay alert:', alert);
    });

    socketIo.on('disconnect', () => {
      console.log('[Tracking] Socket disconnected');
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket || !socket.connected) return;

    if (filter.route) {
      socket.emit('subscribe:route', filter.route);
    }
    if (filter.operatorId) {
      socket.emit('subscribe:operator', filter.operatorId);
    }

    return () => {
      if (filter.route) {
        socket.emit('unsubscribe:route', filter.route);
      }
      if (filter.operatorId) {
        socket.emit('unsubscribe:operator', filter.operatorId);
      }
    };
  }, [socket, filter]);

  useEffect(() => {
    onPositionsUpdate?.(positions);
  }, [positions, onPositionsUpdate]);

  const activeBuses = positions.filter((p) => !p.isStale);
  const staleBuses = positions.filter((p) => p.isStale);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border bg-gray-50">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-2 top-2 z-[1000] rounded-md bg-white/90 px-2 py-1 text-xs shadow">
        <span className="inline-block h-3 w-3 rounded-full bg-zartsa-green" /> {t('fare.daladala')} ({activeBuses.filter((b) => b.serviceType === 'daladala').length})
        {' '}
        <span className="ml-1 inline-block h-3 w-3 rounded-full bg-zartsa-blue" /> {t('fare.shamba')} ({activeBuses.filter((b) => b.serviceType === 'shamba').length})
        {' '}
        <span className="ml-1 inline-block h-3 w-3 rounded-full bg-gray-400" /> {t('track.lastSeen')} ({staleBuses.length})
      </div>
      <MapContainer
        center={ZANZIBAR_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-96 w-full rounded-lg"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positions.map((pos) => (
          <BusMarker key={pos.vehiclePlate} position={pos} />
        ))}
      </MapContainer>
    </div>
  );
}