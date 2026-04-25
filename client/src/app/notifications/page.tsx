'use client';

import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { PageHeader } from '@/components/ui/page-header';
import { ListSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { notifications, isLoading, markAllAsRead } = useNotifications();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <PageHeader title={t('notifications.title')} backHref="/" action={
        notifications.some((n) => !n.isRead) ? (
          <button onClick={markAllAsRead}
            className="rounded-full border border-[#0a7c5c]/30 px-4 py-1.5 text-xs font-semibold text-[#0a7c5c] hover:bg-[#e6f4ef] transition-colors">
            {t('notifications.markAllRead')}
          </button>
        ) : undefined
      } />

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : notifications.length === 0 ? (
        <p className="text-sm text-[#637885]">{t('notifications.empty')}</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id}
              className={cn(
                'rounded-2xl bg-white p-4 transition-colors',
                !n.isRead ? 'bg-gradient-to-r from-[#e6f4ef] to-white border-l-4 border-l-[#0a7c5c]' : 'border border-[#d4dadf]'
              )}>
              <div className="flex items-start gap-3">
                {!n.isRead && <div className="mt-1.5 h-2 w-2 rounded-full bg-[#12a07a] animate-pulse flex-shrink-0" />}
                <div className={!n.isRead ? '' : 'ml-5'}>
                  <p className="text-sm font-medium text-[#0d1820]">{n.title}</p>
                  <p className="mt-0.5 text-sm text-[#2e3f4c]">{n.message}</p>
                  <p className="mt-1 text-xs text-[#637885]">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}