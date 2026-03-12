'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  color?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      color = '#E8580C',
      size = 'md',
      showLabel = false,
      className,
      ...props
    },
    ref
  ) => {
    const clampedValue = Math.max(0, Math.min(100, value));

    const sizes = {
      sm: 'h-1.5',
      md: 'h-2',
    };

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        <div
          className={cn(
            'w-full bg-[#262630] rounded-full overflow-hidden',
            sizes[size]
          )}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${clampedValue}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        {showLabel && (
          <div className="mt-1.5 flex justify-between items-center">
            <span className="text-xs text-[#8888A0]">Progresso</span>
            <span className="text-xs font-medium text-[#E8E8ED]">
              {Math.round(clampedValue)}%
            </span>
          </div>
        )}
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';
