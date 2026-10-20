import { type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: ReactNode;
  footer?: ReactNode;
}

export function Card({
  variant = 'default',
  padding = 'md',
  header,
  footer,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div className={clsx('cn-card', `cn-card--${variant}`, `cn-card--p-${padding}`, className)} {...props}>
      {header && <div className="cn-card__header">{header}</div>}
      <div className="cn-card__body">{children}</div>
      {footer && <div className="cn-card__footer">{footer}</div>}
    </div>
  );
}
