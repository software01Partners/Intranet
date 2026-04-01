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
            'w-full bg-[#E0DCD6] dark:bg-[#3D3D3D] rounded-full overflow-hidden',
            sizes[size]
          )}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${clampedValue}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-[#1B4D3E] to-[#34D399]"
          />
        </div>
        {showLabel && (
          <div className="mt-1.5 flex justify-between items-center">
            <span className="text-xs text-[#B0A99E] dark:text-[#9A9590]">
              Progresso
            </span>
            <span className="text-xs font-medium text-[#2D2A26] dark:text-[#E8E5E0]">
              {Math.round(clampedValue)}%
            </span>
          </div>
        )}
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';
