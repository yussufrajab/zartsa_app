'use client';

import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/components/providers/NotificationProvider';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { notifications, isLoading, markAllAsRead } = useNotifications();

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="rounded-md p-1 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">{t('notifications.title')}</h1>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <button onClick={markAllAsRead} className="text-xs text-zartsa-green hover:underline">
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-gray-500">{t('notifications.empty')}</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`rounded-lg border p-3 ${!n.isRead ? 'border-blue-200 bg-blue-50' : 'bg-white'}`}>
              <p className="font-medium">{n.title}</p>
              <p className="text-sm text-gray-600">{n.message}</p>
              <p className="mt-1 text-xs text-gray-400">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}