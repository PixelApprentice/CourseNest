import clsx from 'clsx';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValueText?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  tone?: 'primary' | 'accent' | 'success' | 'sky';
  className?: string;
}

const heightStyles = {
  xs: 'h-1.5',
  sm: 'h-2',
  md: 'h-2.5',
  lg: 'h-3.5',
};

const barTones = {
  primary: 'bg-[var(--cn-primary)]',
  accent: 'bg-[var(--cn-accent)]',
  success: 'bg-[var(--cn-success)]',
  sky: 'bg-sky-500',
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showValueText = false,
  size = 'sm',
  tone = 'primary',
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, 0), max);
  const percentage = Math.round((clampedValue / max) * 100);

  return (
    <div className={clsx('w-full space-y-1.5', className)}>
      {(label || showValueText) && (
        <div className="flex items-center justify-between text-xs font-mono">
          {label && <span className="text-[var(--cn-text-muted)]">{label}</span>}
          {showValueText && (
            <span className="font-semibold text-[var(--cn-text-primary)]">
              {percentage}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className={clsx(
          'w-full overflow-hidden rounded-full bg-[var(--cn-surface-subtle)] border border-[var(--cn-border)]',
          heightStyles[size],
        )}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-[width] duration-300 ease-out',
            barTones[tone],
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
