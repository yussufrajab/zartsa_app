'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Map as LeafletMap, TileLayer, Marker, divIcon } from 'leaflet';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api-client';
import type { BusPosition, TrackingFilter } from '@zartsa/shared';
import 'leaflet/dist/leaflet.css';

interface BusMapProps {
  filter: TrackingFilter;
  onPositionsUpdate?: (positions: BusPosition[]) => void;
}

const ZANZIBAR_CENTER: [number, number] = [-6.1659, 39.1989];
const DEFAULT_ZOOM = 12;
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || '';

function createBusIcon(position: BusPosition) {
  const color = position.isStale ? '#637785' : position.serviceType === 'daladala' ? '#0a7c5c' : '#1a5f8a';
  const borderColor = position.isStale ? '#8a9baa' : 'white';
  return divIcon({
    className: 'custom-bus-icon',
    html: `<div style="
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: bold; color: white;
      background: ${color}; border: 2px solid ${borderColor};
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      opacity: ${position.isStale ? '0.6' : '1'};
    ">${position.serviceType === 'daladala' ? 'D' : 'S'}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export function BusMap({ filter, onPositionsUpdate }: BusMapProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'sw' ? 'sw' : 'en';
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<globalThis.Map<string, Marker>>(new globalThis.Map());
  const [positions, setPosition] = useState<BusPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize Leaflet map imperatively
  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new LeafletMap(containerRef.current, {
      center: ZANZIBAR_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    new TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;
  }, []);

  // Sync bus markers with the map
  const syncMarkers = useCallback((buses: BusPosition[]) => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(buses.map((b) => b.vehiclePlate));

    // Remove markers for buses no longer in the list
    for (const [plate, marker] of markersRef.current) {
      if (!currentIds.has(plate)) {
        map.removeLayer(marker);
        markersRef.current.delete(plate);
      }
    }

    // Add or update markers
    for (const pos of buses) {
      const latLng: [number, number] = [pos.latitude, pos.longitude];
      const existing = markersRef.current.get(pos.vehiclePlate);

      if (existing) {
        existing.setLatLng(latLng);
        existing.setIcon(createBusIcon(pos));
      } else {
        const recordedTime = new Date(pos.recordedAt);
        const timeStr = recordedTime.toLocaleTimeString(lang === 'sw' ? 'sw-TZ' : 'en-TZ', {
          hour: '2-digit', minute: '2-digit',
        });
        const marker = new Marker(latLng, { icon: createBusIcon(pos) })
          .addTo(map)
          .bindTooltip(
            `<div style="font-size:12px">
              <b>${pos.vehiclePlate}</b><br/>
              ${pos.route}<br/>
              ${pos.serviceType === 'daladala' ? t('fare.daladala') : t('fare.shamba')}<br/>
              ${pos.speed !== null ? `${Math.round(pos.speed)} km/h<br/>` : ''}
              <span style="color:${pos.isStale ? '#637785' : '#0a7c5c'}">
                ${pos.isStale ? `${t('track.lastSeen')}: ${timeStr}` : `${t('track.liveMap')}: ${timeStr}`}
              </span>
            </div>`
          );
        markersRef.current.set(pos.vehiclePlate, marker);
      }
    }
  }, [t, lang]);

  // Create map on mount, destroy on unmount
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(initMap, 0);
    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current.clear();
    };
  }, [initMap]);

  // Fetch bus positions
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
        setPosition(response.data);
      } catch {
        // Will show empty map
      } finally {
        setLoading(false);
      }
    }
    fetchPositions();
  }, [filter]);

  // Socket.IO for real-time updates
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
      setPosition((prev) => {
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

  // Socket subscriptions
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
        socket.emit('subscribe:operator', filter.operatorId);
      }
    };
  }, [socket, filter]);

  // Sync positions with parent
  useEffect(() => {
    onPositionsUpdate?.(positions);
  }, [positions, onPositionsUpdate]);

  // Sync markers with map when positions change
  useEffect(() => {
    syncMarkers(positions);
  }, [positions, syncMarkers]);

  const activeBuses = positions.filter((p) => !p.isStale);
  const staleBuses = positions.filter((p) => p.isStale);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-3xl border border-[#d4dadf] bg-[#f5f9f7]">
        <p className="text-sm text-[#637785]">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-2 top-2 z-[1000] rounded-xl bg-white/90 backdrop-blur-md px-3 py-1.5 text-xs shadow-md border border-[#d4dadf]/50">
        <span className="inline-block h-3 w-3 rounded-full bg-[#0a7c5c]" /> {t('fare.daladala')} ({activeBuses.filter((b) => b.serviceType === 'daladala').length})
        {' '}
        <span className="ml-1 inline-block h-3 w-3 rounded-full bg-[#1a5f8a]" /> {t('fare.shamba')} ({activeBuses.filter((b) => b.serviceType === 'shamba').length})
        {' '}
        <span className="ml-1 inline-block h-3 w-3 rounded-full bg-[#637785]/40" /> {t('track.lastSeen')} ({staleBuses.length})
      </div>
      <div ref={containerRef} className="h-96 w-full rounded-3xl" />
    </div>
  );
}