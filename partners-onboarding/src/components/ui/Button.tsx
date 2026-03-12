'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
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
      'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-offset-[#F8F9FC] dark:focus:ring-offset-[#0F0F1A]';

    const variants = {
      primary:
        'bg-[#6B2FA0] text-white hover:bg-[#5A2788] focus:ring-[#6B2FA0]/30 dark:bg-[#8B5CF6] dark:hover:bg-[#7C3AED] dark:focus:ring-[#8B5CF6]/30',
      secondary:
        'bg-[#F1F3F8] text-[#1A1D2E] hover:bg-[#E2E5F1] focus:ring-[#E2E5F1] dark:bg-[#2D2D4A] dark:text-[#E8E8ED] dark:hover:bg-[#3D3D5C] dark:focus:ring-[#2D2D4A]',
      ghost:
        'text-[#6B7194] hover:bg-[#F1F3F8] hover:text-[#1A1D2E] focus:ring-[#E2E5F1] dark:text-[#8888A0] dark:hover:bg-[#2D2D4A] dark:hover:text-[#E8E8ED] dark:focus:ring-[#2D2D4A]',
      danger:
        'bg-[#EF4444] text-white hover:bg-[#DC2626] focus:ring-[#EF4444]/30',
      accent:
        'bg-[#F5A623] text-white hover:bg-[#E0951F] focus:ring-[#F5A623]/30',
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
