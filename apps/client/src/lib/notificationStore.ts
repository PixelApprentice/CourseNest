import { useState, useEffect } from 'react';

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';
export type NotificationCategory = 'system' | 'course' | 'backup' | 'ai';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  created_at: string;
  is_read: boolean;
  link?: string;
}

const NOTIFICATIONS_KEY = 'coursenest_notifications_v1';

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Offline Vault Initialized',
    message: 'Local learning vault is operational with zero-cloud sandbox security.',
    priority: 'normal',
    category: 'system',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    is_read: false,
    link: '/settings',
  },
  {
    id: 'notif-2',
    title: 'Removable Storage Ready',
    message: 'External storage tier configured. Progress is preserved across disconnections.',
    priority: 'low',
    category: 'backup',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    is_read: false,
    link: '/settings',
  },
  {
    id: 'notif-3',
    title: 'AI Reading Companion Available',
    message: 'Optional BYO-API assistant ready. Connect Gemini Pro or OmniRoute without local GPU overhead.',
    priority: 'normal',
    category: 'ai',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    is_read: false,
    link: '/settings',
  },
];

export function getNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return DEFAULT_NOTIFICATIONS;
}

export function saveNotifications(notifications: AppNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new Event('coursenest_notifications_changed'));
  } catch {}
}

export function markAsRead(id: string): void {
  const current = getNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, is_read: true } : n));
  saveNotifications(updated);
}

export function markAllAsRead(): void {
  const current = getNotifications();
  const updated = current.map((n) => ({ ...n, is_read: true }));
  saveNotifications(updated);
}

export function clearNotifications(): void {
  saveNotifications([]);
}

export function addNotification(payload: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>): AppNotification {
  const current = getNotifications();
  const newNotif: AppNotification = {
    ...payload,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
    is_read: false,
  };
  saveNotifications([newNotif, ...current.slice(0, 49)]); // keep max 50
  return newNotif;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(getNotifications());

  useEffect(() => {
    const handleUpdate = () => setNotifications(getNotifications());
    window.addEventListener('coursenest_notifications_changed', handleUpdate);
    return () => window.removeEventListener('coursenest_notifications_changed', handleUpdate);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    addNotification,
  };
}
