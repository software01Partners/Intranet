'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  labelSize?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  color = '#E8580C',
  backgroundColor = '#262630',
  showLabel = true,
  labelSize = 'md',
  className,
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));

  useEffect(() => {
    // Animate value change
    const duration = 1000; // 1 second
    const steps = 60;
    const increment = clampedValue / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(increment * step, clampedValue);
      setAnimatedValue(current);

      if (step >= steps) {
        clearInterval(timer);
        setAnimatedValue(clampedValue);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [clampedValue]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;

  const labelSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              'font-semibold text-[#E8E8ED]',
              labelSizes[labelSize]
            )}
          >
            {Math.round(animatedValue)}%
          </span>
        </div>
      )}
    </div>
  );
}
