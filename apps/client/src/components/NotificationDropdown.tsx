import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  IconBell, 
  IconInfoCircle, 
  IconAlertTriangle, 
  IconAlertCircle, 
  IconCircleCheck, 
  IconCheck, 
  IconTrash 
} from '@tabler/icons-react';
import { useNotifications, type AppNotification, type NotificationPriority } from '../lib/notificationStore';
import clsx from 'clsx';

const PRIORITY_ICON: Record<NotificationPriority, any> = {
  urgent: IconAlertCircle,
  high: IconAlertTriangle,
  normal: IconBell,
  low: IconInfoCircle,
};

const PRIORITY_ICON_COLOR: Record<NotificationPriority, string> = {
  urgent: 'text-red-500',
  high: 'text-[var(--cn-accent)]',
  normal: 'text-[var(--cn-primary)]',
  low: 'text-sky-400',
};

const PRIORITY_BG: Record<NotificationPriority, string> = {
  urgent: 'bg-red-500/10 border-red-500/20',
  high: 'bg-[var(--cn-accent-tint)] border-[var(--cn-accent)]/20',
  normal: '',
  low: 'bg-sky-500/5 border-sky-500/15',
};

function formatTimestamp(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-lg text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] border border-transparent hover:border-[var(--cn-border)] transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-95"
        title="Notifications"
        aria-label="View notifications"
      >
        <IconBell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--cn-primary)] text-[9px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ease-out origin-top-right">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--cn-border)] flex items-center justify-between bg-[var(--cn-surface-subtle)]/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono tracking-wider uppercase text-[var(--cn-text-primary)]">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/30">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-[11px] font-mono text-[var(--cn-text-muted)] hover:text-[var(--cn-primary)] transition-colors flex items-center gap-1"
                  title="Mark all as read"
                >
                  <IconCheck size={12} />
                  <span>Mark all</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => clearNotifications()}
                  className="p-1 rounded text-[var(--cn-text-muted)] hover:text-red-500 hover:bg-[var(--cn-surface-subtle)] transition-colors"
                  title="Clear all"
                >
                  <IconTrash size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-[var(--cn-border)]/50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <IconCircleCheck size={24} className="mx-auto text-[var(--cn-text-muted)] opacity-60" />
                <p className="text-xs font-mono text-[var(--cn-text-muted)]">No notifications at this time</p>
              </div>
            ) : (
              notifications.map((n: AppNotification) => {
                const Icon = PRIORITY_ICON[n.priority] || IconBell;
                const iconColor = PRIORITY_ICON_COLOR[n.priority] || 'text-[var(--cn-text-muted)]';
                const bgTint = PRIORITY_BG[n.priority];

                return (
                  <div
                    key={n.id}
                    className={clsx(
                      'group relative flex items-start gap-3 p-3.5 transition-colors',
                      !n.is_read ? 'bg-[var(--cn-surface-subtle)]/70' : 'hover:bg-[var(--cn-surface-subtle)]/30 opacity-75',
                      bgTint,
                    )}
                  >
                    <div className={clsx('mt-0.5 shrink-0', iconColor)}>
                      <Icon size={15} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={clsx('text-xs leading-snug text-[var(--cn-text-primary)]', !n.is_read ? 'font-bold' : 'font-medium')}>
                          {n.title}
                        </p>
                        <span className="text-[10px] font-mono text-[var(--cn-text-muted)] shrink-0">
                          {formatTimestamp(n.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--cn-surface)] border border-[var(--cn-border)] text-[var(--cn-text-muted)]">
                          {n.category}
                        </span>

                        {n.link && (
                          <Link
                            to={n.link}
                            onClick={() => {
                              markAsRead(n.id);
                              setIsOpen(false);
                            }}
                            className="text-[11px] font-mono text-[var(--cn-primary)] hover:underline"
                          >
                            View details &rarr;
                          </Link>
                        )}
                      </div>
                    </div>

                    {!n.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--cn-text-muted)] hover:text-[var(--cn-primary)] hover:bg-[var(--cn-surface)] transition-all shrink-0"
                        title="Mark as read"
                      >
                        <IconCheck size={13} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
