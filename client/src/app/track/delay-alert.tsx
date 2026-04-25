'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { io, Socket } from 'socket.io-client';
import { AlertTriangle, Clock, X } from 'lucide-react';

interface DelayAlertData {
  vehiclePlate: string;
  route: string;
  delayMinutes: number;
}

interface DelayAlertProps {
  positions: { vehiclePlate: string; route: string; recordedAt: string; isStale: boolean }[];
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function DelayAlert({ positions }: DelayAlertProps) {
  const { t } = useTranslation();
  const [delayAlerts, setDelayAlerts] = useState<DelayAlertData[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const socketIo = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socketIo.on('delay:alert', (alert: DelayAlertData) => {
      setDelayAlerts((prev) => {
        const exists = prev.find((a) => a.vehiclePlate === alert.vehiclePlate);
        if (exists) {
          return prev.map((a) => a.vehiclePlate === alert.vehiclePlate ? alert : a);
        }
        return [...prev, alert];
      });
    });

    return () => {
      socketIo.disconnect();
    };
  }, []);

  const staleBuses = positions.filter((p) => p.isStale);

  const dismissAlert = (plate: string) => {
    setDismissedAlerts((prev) => new Set([...prev, plate]));
  };

  const visibleAlerts = delayAlerts.filter((a) => !dismissedAlerts.has(a.vehiclePlate));

  if (visibleAlerts.length === 0 && staleBuses.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.vehiclePlate}
          className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {t('track.delayed')}: {alert.vehiclePlate}
            </p>
            <p className="text-xs text-amber-700">
              {alert.route} — {alert.delayMinutes} {t('track.eta')}
            </p>
          </div>
          <button
            onClick={() => dismissAlert(alert.vehiclePlate)}
            className="text-amber-500 hover:text-amber-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {staleBuses.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-[#d4dadf] bg-[#f5f9f7] p-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#637785]" />
          <div>
            <p className="text-sm font-medium text-[#0d1820]">{t('track.lastSeen')}</p>
            <p className="text-xs text-[#637785]">
              {staleBuses.length} {staleBuses.length === 1 ? 'bus' : 'buses'} — GPS data older than 5 minutes
            </p>
            <ul className="mt-1 space-y-0.5">
              {staleBuses.slice(0, 3).map((bus) => (
                <li key={bus.vehiclePlate} className="text-xs text-[#637785]">
                  {bus.vehiclePlate} ({bus.route})
                </li>
              ))}
              {staleBuses.length > 3 && (
                <li className="text-xs text-[#637785]">+{staleBuses.length - 3} more</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}