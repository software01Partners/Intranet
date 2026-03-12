import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'soft';
  color?: 'accent' | 'green' | 'blue' | 'red' | 'yellow' | 'purple' | 'gray';
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      variant = 'soft',
      color = 'gray',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium transition-colors';

    const colorStyles = {
      accent: {
        solid: 'bg-[#E8580C] text-white',
        soft: 'bg-[#E8580C]/10 text-[#E8580C]',
      },
      green: {
        solid: 'bg-green-600 text-white',
        soft: 'bg-green-600/10 text-green-400',
      },
      blue: {
        solid: 'bg-blue-600 text-white',
        soft: 'bg-blue-600/10 text-blue-400',
      },
      red: {
        solid: 'bg-red-600 text-white',
        soft: 'bg-red-600/10 text-red-400',
      },
      yellow: {
        solid: 'bg-yellow-600 text-white',
        soft: 'bg-yellow-600/10 text-yellow-400',
      },
      purple: {
        solid: 'bg-purple-600 text-white',
        soft: 'bg-purple-600/10 text-purple-400',
      },
      gray: {
        solid: 'bg-[#262630] text-[#E8E8ED]',
        soft: 'bg-[#262630]/50 text-[#8888A0]',
      },
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          colorStyles[color][variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';
