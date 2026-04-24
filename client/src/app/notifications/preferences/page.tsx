'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { NotificationType } from '@zartsa/shared';
import { NOTIFICATION_TYPES, DEFAULT_NOTIFICATION_PREFS } from '@zartsa/shared';

interface PrefRow {
  type: NotificationType;
  inApp: boolean;
  sms: boolean;
  email: boolean;
}

export default function NotificationPreferencesPage() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<PrefRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: PrefRow[] }>('/notifications/preferences')
      .then((res) => setPrefs(res.data))
      .catch(() => setPrefs([]))
      .finally(() => setIsLoading(false));
  }, []);

  const togglePref = async (type: NotificationType, channel: 'inApp' | 'sms' | 'email') => {
    const current = prefs.find((p) => p.type === type);
    if (!current) return;

    const newValue = !current[channel];
    setPrefs((prev) => prev.map((p) => p.type === type ? { ...p, [channel]: newValue } : p));
    setSaving(type);

    try {
      await api.patch('/notifications/preferences', { type, [channel]: newValue });
    } catch {
      setPrefs((prev) => prev.map((p) => p.type === type ? { ...p, [channel]: !newValue } : p));
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) return <p className="p-4 text-sm text-gray-500">{t('common.loading')}</p>;

  const channelLabels = { inApp: t('notifications.channels.inApp'), sms: t('notifications.channels.sms'), email: t('notifications.channels.email') };
  const channels: ('inApp' | 'sms' | 'email')[] = ['inApp', 'sms', 'email'];

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/notifications" className="rounded-md p-1 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{t('notifications.preferences')}</h1>
      </div>

      <div className="space-y-3">
        {prefs.map((pref) => (
          <div key={pref.type} className="rounded-lg border p-3">
            <p className="mb-2 text-sm font-medium">{t(`notifications.types.${pref.type}`)}</p>
            <div className="flex gap-4">
              {channels.map((ch) => (
                <label key={ch} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={pref[ch]}
                    onChange={() => togglePref(pref.type, ch)}
                    disabled={saving === pref.type}
                    className="h-3.5 w-3.5"
                  />
                  {channelLabels[ch]}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}