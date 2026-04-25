'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import type { NotificationType } from '@zartsa/shared';
import { NOTIFICATION_TYPES } from '@zartsa/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Toggle } from '@/components/ui/toggle';
import { ListSkeleton } from '@/components/ui/skeleton';

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

  if (isLoading) return <ListSkeleton count={5} />;

  const channelLabels = { inApp: t('notifications.channels.inApp'), sms: t('notifications.channels.sms'), email: t('notifications.channels.email') };
  const channels: ('inApp' | 'sms' | 'email')[] = ['inApp', 'sms', 'email'];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('notifications.preferences')} backHref="/notifications" />

      <div className="space-y-3">
        {prefs.map((pref) => (
          <div key={pref.type} className="rounded-2xl border border-[#d4dadf] bg-white p-4">
            <p className="mb-3 text-sm font-medium text-[#0d1820]">{t(`notifications.types.${pref.type}`)}</p>
            <div className="flex gap-6">
              {channels.map((ch) => (
                <Toggle
                  key={ch}
                  checked={pref[ch]}
                  onChange={(val) => togglePref(pref.type, ch)}
                  label={channelLabels[ch]}
                  disabled={saving === pref.type}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}