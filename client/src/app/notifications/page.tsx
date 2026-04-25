'use client';

import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/components/ui/skeleton';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { notifications, isLoading, markAllAsRead } = useNotifications();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('notifications.title')} backHref="/" action={
        notifications.some((n) => !n.isRead) ? (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            {t('notifications.markAllRead')}
          </Button>
        ) : undefined
      } />

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : notifications.length === 0 ? (
        <p className="text-sm text-slate-500">{t('notifications.empty')}</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} variant="gradient" accentColor={!n.isRead ? 'green' : undefined} size="compact"
              className={!n.isRead ? 'border-l-2 border-l-primary' : ''}>
              <div className="flex items-start gap-3">
                {!n.isRead && <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                <div className={!n.isRead ? '' : 'ml-5'}>
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}