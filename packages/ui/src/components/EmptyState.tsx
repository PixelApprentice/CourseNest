import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('cn-empty-state', className)}>
      {icon && <div className="cn-empty-state__icon">{icon}</div>}
      <h3 className="cn-empty-state__title">{title}</h3>
      {description && <p className="cn-empty-state__description">{description}</p>}
      {action && <div className="cn-empty-state__action">{action}</div>}
    </div>
  );
}
