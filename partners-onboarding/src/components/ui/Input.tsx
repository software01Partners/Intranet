'use client';

import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, className, id, ...props }, ref) => {
    const reactId = useId();
    const inputId = id || reactId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0] mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0A99E] dark:text-[#9A9590] pointer-events-none">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl bg-[#F5F3EF] dark:bg-[#1A1A1A] border border-[#E0DCD6] dark:border-[#3D3D3D] text-[#2D2A26] dark:text-[#E8E5E0] placeholder:text-[#B0A99E] dark:placeholder:text-[#7A7468] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/30 dark:focus:ring-[#34D399]/30 focus:border-[#1B4D3E] dark:focus:border-[#34D399] disabled:opacity-50 disabled:cursor-not-allowed',
              Icon && 'pl-11',
              error && 'border-[#EF4444] focus:ring-[#EF4444]/30 focus:border-[#EF4444]',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-[#EF4444] flex items-center gap-1">
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
