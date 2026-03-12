'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon: Icon,
      iconPosition = 'left',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0F] disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-[#E8580C] text-white hover:bg-[#E8580C]/90 focus:ring-[#E8580C] active:bg-[#E8580C]/80',
      secondary:
        'bg-[#262630] text-[#E8E8ED] hover:bg-[#2A2A35] focus:ring-[#262630] active:bg-[#2F2F3A]',
      ghost:
        'text-[#8888A0] hover:text-[#E8E8ED] hover:bg-[#13131A] focus:ring-[#262630] active:bg-[#1A1A24]',
      danger:
        'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 active:bg-red-800',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
        )}
        {!loading && Icon && iconPosition === 'left' && (
          <Icon className={iconSizes[size]} />
        )}
        {children && <span>{children}</span>}
        {!loading && Icon && iconPosition === 'right' && (
          <Icon className={iconSizes[size]} />
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
