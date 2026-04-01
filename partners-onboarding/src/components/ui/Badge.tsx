import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type BadgeColor =
  | 'accent'
  | 'green'
  | 'blue'
  | 'red'
  | 'yellow'
  | 'purple'
  | 'gray'
  | 'admin'
  | 'gestor'
  | 'colaborador'
  | 'obrigatoria_global'
  | 'obrigatoria_area'
  | 'optativa_global'
  | 'optativa_area';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'soft';
  color?: BadgeColor;
}

const badgeColorMap: Record<
  BadgeColor,
  { solid: string; soft: string }
> = {
  accent: {
    solid: 'bg-[#D4A053] text-white',
    soft: 'bg-[#D4A053]/10 text-[#B8893E] dark:bg-[#D4A053]/15 dark:text-[#D4A053]',
  },
  green: {
    solid: 'bg-[#10B981] text-white',
    soft: 'bg-[#10B981]/10 text-[#10B981] dark:bg-[#10B981]/15 dark:text-[#34D399]',
  },
  blue: {
    solid: 'bg-[#3B82F6] text-white',
    soft: 'bg-[#3B82F6]/10 text-[#3B82F6] dark:bg-[#3B82F6]/15 dark:text-[#60A5FA]',
  },
  red: {
    solid: 'bg-[#EF4444] text-white',
    soft: 'bg-[#EF4444]/10 text-[#EF4444] dark:bg-[#EF4444]/15 dark:text-[#F87171]',
  },
  yellow: {
    solid: 'bg-[#F59E0B] text-white',
    soft: 'bg-[#F59E0B]/10 text-[#F59E0B] dark:bg-[#F59E0B]/15 dark:text-[#FBBF24]',
  },
  purple: {
    solid: 'bg-[#1B4D3E] text-white dark:bg-[#34D399] dark:text-[#1A1A1A]',
    soft: 'bg-[#1B4D3E]/10 text-[#1B4D3E] dark:bg-[#34D399]/15 dark:text-[#6EE7B7]',
  },
  gray: {
    solid: 'bg-[#7A7468] text-white dark:bg-[#3D3D3D] dark:text-[#E8E5E0]',
    soft: 'bg-[#E0DCD6]/80 text-[#7A7468] dark:bg-[#3D3D3D] dark:text-[#9A9590]',
  },
  admin: {
    solid: 'bg-[#1B4D3E] text-white dark:bg-[#34D399] dark:text-[#1A1A1A]',
    soft: 'bg-[#1B4D3E]/10 text-[#1B4D3E] dark:bg-[#34D399]/15 dark:text-[#6EE7B7]',
  },
  gestor: {
    solid: 'bg-[#D4A053] text-white',
    soft: 'bg-[#D4A053]/10 text-[#B8893E] dark:bg-[#D4A053]/15 dark:text-[#D4A053]',
  },
  colaborador: {
    solid: 'bg-[#3B82F6] text-white',
    soft: 'bg-[#3B82F6]/10 text-[#3B82F6] dark:bg-[#3B82F6]/15 dark:text-[#60A5FA]',
  },
  obrigatoria_global: {
    solid: 'bg-[#1B4D3E] text-white dark:bg-[#34D399] dark:text-[#1A1A1A]',
    soft: 'bg-[#1B4D3E]/10 text-[#1B4D3E] dark:bg-[#34D399]/15 dark:text-[#6EE7B7]',
  },
  obrigatoria_area: {
    solid: 'bg-[#3B82F6] text-white',
    soft: 'bg-[#3B82F6]/10 text-[#3B82F6] dark:bg-[#3B82F6]/15 dark:text-[#60A5FA]',
  },
  optativa_global: {
    solid: 'bg-[#10B981] text-white',
    soft: 'bg-[#10B981]/10 text-[#10B981] dark:bg-[#10B981]/15 dark:text-[#34D399]',
  },
  optativa_area: {
    solid: 'bg-[#14B8A6] text-white',
    soft: 'bg-[#14B8A6]/10 text-[#14B8A6] dark:bg-[#14B8A6]/15 dark:text-[#2DD4BF]',
  },
};

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
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide transition-colors';

    const colors = badgeColorMap[color] ?? badgeColorMap.gray;

    return (
      <div
        ref={ref}
        className={cn(baseStyles, colors[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';
