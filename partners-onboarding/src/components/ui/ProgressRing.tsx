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

const defaultGradient = 'url(#progress-ring-gradient)';

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  showLabel = true,
  labelSize = 'md',
  className,
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  const clampedValue = Math.max(0, Math.min(100, value));

  useEffect(() => {
    const duration = 1000;
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
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="progress-ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1B4D3E" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-[#E0DCD6] dark:text-[#3D3D3D]"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={defaultGradient}
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
              'font-bold text-[#2D2A26] dark:text-[#E8E5E0]',
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
