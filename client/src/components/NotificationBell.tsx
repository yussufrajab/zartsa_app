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
        className="relative h-10 w-10 rounded-full flex items-center justify-center transition-colors hover:bg-[#e6f4ef]"
        aria-label={t('notifications.title')}
      >
        <Bell className="h-5 w-5 text-[#475a68]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-gradient-to-br from-[#e8433d] to-[#d4322c] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-88 rounded-2xl bg-white border border-[#d4dadf]/50 shadow-premium overflow-hidden">
          <div className="px-5 py-4 border-b border-[#eaeef0] bg-gradient-to-r from-[#f5f9f7] to-white">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0d1820]">{t('notifications.title')}</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="rounded-full border border-[#0a7c5c]/30 px-4 py-1.5 text-xs font-semibold text-[#0a7c5c] hover:bg-[#e6f4ef] transition-colors">
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[#8a9baa] text-center">{t('notifications.empty')}</p>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <div key={n.id} className={`border-b border-[#eaeef0] px-5 py-3 text-sm transition-colors ${!n.isRead ? 'bg-[#e6f4ef]/50 hover:bg-[#e6f4ef]' : 'hover:bg-[#f5f9f7]'}`}>
                  <div className="flex items-center gap-2">
                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-[#12a07a] animate-pulse flex-shrink-0" />}
                    <p className="font-semibold text-[#0d1820]">{n.title}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-[#637885]">{n.message}</p>
                  <p className="mt-1 text-[10px] text-[#8a9baa]">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-[#eaeef0] px-5 py-3 text-center">
            <Link href="/notifications" className="text-xs font-semibold text-[#0a7c5c] hover:underline">
              {t('notifications.viewAll')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}