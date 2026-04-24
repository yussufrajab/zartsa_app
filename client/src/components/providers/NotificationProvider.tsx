'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import type { Notification } from '@zartsa/shared';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ data: { items: Notification[]; total: number } }>('/notifications?limit=20');
      setNotifications(res.data.items);
      const countRes = await api.get<{ data: { count: number } }>('/notifications/unread-count');
      setUnreadCount(countRes.data.count);
    } catch {
      // Silently fail - notifications are non-critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (ids: string[]) => {
    await api.patch('/notifications/read', { ids });
    setNotifications((prev) => prev.map((n) => ids.includes(n.id) ? { ...n, isRead: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - ids.length));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('zartsa_token');
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}