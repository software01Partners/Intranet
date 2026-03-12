import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'line' | 'circle' | 'card';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'line',
      width,
      height,
      className,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'bg-[#1A1A24] animate-pulse';

    const variants = {
      line: 'h-4 rounded-lg',
      circle: 'rounded-full',
      card: 'h-32 rounded-xl',
    };

    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height)
      style.height = typeof height === 'number' ? `${height}px` : height;

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          className
        )}
        style={style}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';
