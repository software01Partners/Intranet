'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
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
            'w-full bg-[#E2E5F1] dark:bg-[#2D2D4A] rounded-full overflow-hidden',
            sizes[size]
          )}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${clampedValue}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-[#6B2FA0] to-[#8B5CF6]"
          />
        </div>
        {showLabel && (
          <div className="mt-1.5 flex justify-between items-center">
            <span className="text-xs text-[#9CA3C4] dark:text-[#8888A0]">
              Progresso
            </span>
            <span className="text-xs font-medium text-[#1A1D2E] dark:text-[#E8E8ED]">
              {Math.round(clampedValue)}%
            </span>
          </div>
        )}
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';
