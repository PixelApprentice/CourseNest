import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx('cn-button', `cn-button--${variant}`, `cn-button--${size}`, className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <span className="cn-button__spinner" aria-hidden="true" />}
      {!isLoading && leftIcon && <span className="cn-button__icon">{leftIcon}</span>}
      <span className="cn-button__label">{children}</span>
      {rightIcon && <span className="cn-button__icon">{rightIcon}</span>}
    </button>
  );
}
