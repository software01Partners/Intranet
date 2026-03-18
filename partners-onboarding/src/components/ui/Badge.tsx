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
    solid: 'bg-[#F5A623] text-white',
    soft: 'bg-[#F5A623]/10 text-[#E0951F] dark:bg-[#F5A623]/15 dark:text-[#F5A623]',
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
    solid: 'bg-[#6B2FA0] text-white dark:bg-[#8B5CF6]',
    soft: 'bg-[#6B2FA0]/10 text-[#6B2FA0] dark:bg-[#8B5CF6]/15 dark:text-[#A78BFA]',
  },
  gray: {
    solid: 'bg-[#6B7194] text-white dark:bg-[#2D2D4A] dark:text-[#E8E8ED]',
    soft: 'bg-[#E2E5F1]/80 text-[#6B7194] dark:bg-[#2D2D4A] dark:text-[#8888A0]',
  },
  admin: {
    solid: 'bg-[#6B2FA0] text-white dark:bg-[#8B5CF6]',
    soft: 'bg-[#6B2FA0]/10 text-[#6B2FA0] dark:bg-[#8B5CF6]/15 dark:text-[#A78BFA]',
  },
  gestor: {
    solid: 'bg-[#F5A623] text-white',
    soft: 'bg-[#F5A623]/10 text-[#E0951F] dark:bg-[#F5A623]/15 dark:text-[#F5A623]',
  },
  colaborador: {
    solid: 'bg-[#3B82F6] text-white',
    soft: 'bg-[#3B82F6]/10 text-[#3B82F6] dark:bg-[#3B82F6]/15 dark:text-[#60A5FA]',
  },
  obrigatoria_global: {
    solid: 'bg-[#6B2FA0] text-white dark:bg-[#8B5CF6]',
    soft: 'bg-[#6B2FA0]/10 text-[#6B2FA0] dark:bg-[#8B5CF6]/15 dark:text-[#A78BFA]',
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
