import { clsx } from 'clsx';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  variant = 'default',
  size = 'md',
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  return (
    <div className={clsx('cn-progress', `cn-progress--${variant}`, `cn-progress--${size}`, className)}>
      {label && <span className="cn-progress__label">{label}</span>}
      <div className="cn-progress__track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className="cn-progress__fill" style={{ width: `${percentage}%` }} />
      </div>
      {showPercentage && <span className="cn-progress__percentage">{percentage}%</span>}
    </div>
  );
}
