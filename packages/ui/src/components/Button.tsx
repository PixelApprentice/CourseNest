import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isActive?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    isLoading = false,
    isActive = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    ...props
  },
  ref
) {
  const isIconOnly = variant === 'icon' || (!children && (leftIcon || rightIcon));

  const sizeClasses = {
    sm: isIconOnly ? 'h-7 w-7 p-1 rounded-lg' : 'h-7 px-2.5 py-1 text-[11px] rounded-lg gap-1.5',
    md: isIconOnly ? 'h-9 w-9 p-1.5 rounded-xl' : 'h-9 px-3.5 py-1.5 text-xs rounded-xl gap-2',
    lg: isIconOnly ? 'h-11 w-11 p-2 rounded-xl' : 'h-11 px-5 py-2 text-sm rounded-xl gap-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-[var(--cn-primary)] text-[var(--cn-primary-text)] border border-[var(--cn-primary)] hover:bg-[var(--cn-primary-hover)] shadow-xs font-bold active:scale-95',
    secondary:
      'bg-[var(--cn-surface)] text-[var(--cn-text-primary)] border border-[var(--cn-border)] hover:bg-[var(--cn-surface-hover)] hover:border-[var(--cn-border-highlight)] shadow-xs font-semibold active:scale-95',
    ghost:
      'bg-transparent text-[var(--cn-text-secondary)] border border-transparent hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] font-medium active:scale-95',
    danger:
      'bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50 shadow-xs font-semibold active:scale-95',
    icon:
      'bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)] border border-[var(--cn-border)] hover:bg-[var(--cn-surface-hover)] hover:text-[var(--cn-text-primary)] shadow-xs active:scale-95',
  }[variant];

  const activeClasses = isActive
    ? 'bg-[var(--cn-surface)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40 shadow-xs font-bold'
    : '';

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={clsx(
        'inline-flex items-center justify-center select-none font-sans tracking-tight cursor-pointer',
        'transition-[background-color,color,box-shadow,transform,border-color] duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cn-primary)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--cn-bg)]',
        'disabled:opacity-50 disabled:pointer-events-none disabled:scale-100 disabled:shadow-none',
        sizeClasses,
        variantClasses,
        activeClasses,
        className
      )}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>
      )}
      {children && <span className="truncate">{children}</span>}
      {!isLoading && rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
    </button>
  );
});
