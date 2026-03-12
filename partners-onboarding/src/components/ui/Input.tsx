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
            className="block text-sm font-medium text-[#1A1D2E] dark:text-[#E8E8ED] mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3C4] dark:text-[#8888A0] pointer-events-none">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl bg-[#F8F9FC] dark:bg-[#0F0F1A] border border-[#E2E5F1] dark:border-[#2D2D4A] text-[#1A1D2E] dark:text-[#E8E8ED] placeholder:text-[#9CA3C4] dark:placeholder:text-[#6B7194] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#6B2FA0]/30 dark:focus:ring-[#8B5CF6]/30 focus:border-[#6B2FA0] dark:focus:border-[#8B5CF6] disabled:opacity-50 disabled:cursor-not-allowed',
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
