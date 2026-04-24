'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { useNotifications } from './providers/NotificationProvider';
import Link from 'next/link';

export function NotificationBell() {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = async () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
      if (unreadIds.length > 0) {
        await markAsRead(unreadIds);
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative rounded-md p-2 hover:bg-gray-100"
        aria-label={t('notifications.title')}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <h3 className="text-sm font-semibold">{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-zartsa-green hover:underline">
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500">{t('notifications.empty')}</p>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <div key={n.id} className={`border-b px-4 py-2 text-sm ${!n.isRead ? 'bg-blue-50' : ''}`}>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-gray-600">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="border-t px-4 py-2 text-center">
            <Link href="/notifications" className="text-xs text-zartsa-green hover:underline">
              {t('notifications.viewAll')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}