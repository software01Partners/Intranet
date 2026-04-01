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
      'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-offset-[#F5F3EF] dark:focus:ring-offset-[#1A1A1A]';

    const variants = {
      primary:
        'bg-[#1B4D3E] text-white hover:bg-[#153D31] focus:ring-[#1B4D3E]/30 dark:bg-[#34D399] dark:text-[#1A1A1A] dark:hover:bg-[#2BB585] dark:focus:ring-[#34D399]/30',
      secondary:
        'bg-[#EDE9E3] text-[#2D2A26] hover:bg-[#E0DCD6] focus:ring-[#E0DCD6] dark:bg-[#3D3D3D] dark:text-[#E8E5E0] dark:hover:bg-[#4D4D4D] dark:focus:ring-[#3D3D3D]',
      ghost:
        'text-[#7A7468] hover:bg-[#EDE9E3] hover:text-[#2D2A26] focus:ring-[#E0DCD6] dark:text-[#9A9590] dark:hover:bg-[#3D3D3D] dark:hover:text-[#E8E5E0] dark:focus:ring-[#3D3D3D]',
      danger:
        'bg-[#EF4444] text-white hover:bg-[#DC2626] focus:ring-[#EF4444]/30',
      accent:
        'bg-[#D4A053] text-white hover:bg-[#B8893E] focus:ring-[#D4A053]/30',
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
