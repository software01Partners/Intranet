'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg';
  iconClassName?: string;
}

const iconSizes = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className,
  iconSize = 'md',
  iconClassName,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div
        className={cn(
          'mb-4 text-[#B0A99E] dark:text-[#9A9590]',
          iconSizes[iconSize],
          iconClassName
        )}
      >
        <Icon className="w-full h-full" />
      </div>
      <h3 className="text-lg font-bold text-[#2D2A26] dark:text-[#E8E5E0] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[#7A7468] dark:text-[#9A9590] max-w-md mb-6">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
