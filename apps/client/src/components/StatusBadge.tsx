import type { ReactNode } from 'react';
import clsx from 'clsx';

export type StatusBadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

export interface StatusBadgeProps {
  label?: string;
  tone?: StatusBadgeTone;
  size?: 'sm' | 'md';
  showDot?: boolean;
  pulsing?: boolean;
  className?: string;
  children?: ReactNode;
}

const toneStyles: Record<StatusBadgeTone, string> = {
  neutral: 'bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)] border-[var(--cn-border)]',
  success: 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/30',
  warning: 'bg-[var(--cn-accent-tint)] text-[var(--cn-accent)] border-[var(--cn-accent)]/30',
  danger: 'bg-red-500/10 text-red-500 border-red-500/25',
  info: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
};

const dotStyles: Record<StatusBadgeTone, string> = {
  neutral: 'bg-[var(--cn-text-muted)]',
  success: 'bg-[var(--cn-primary)]',
  warning: 'bg-[var(--cn-accent)]',
  danger: 'bg-red-500',
  info: 'bg-sky-400',
  purple: 'bg-purple-400',
};

export function StatusBadge({
  label,
  tone = 'neutral',
  size = 'sm',
  showDot = true,
  pulsing = false,
  className,
  children,
}: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-mono font-medium tracking-wide transition-colors select-none',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        toneStyles[tone],
        className,
      )}
    >
      {showDot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulsing && (
            <span
              className={clsx(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                dotStyles[tone],
              )}
            />
          )}
          <span className={clsx('relative inline-flex rounded-full h-1.5 w-1.5', dotStyles[tone])} />
        </span>
      )}
      {label || children}
    </span>
  );
}
