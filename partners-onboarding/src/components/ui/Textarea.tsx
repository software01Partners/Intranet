'use client';

import { TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, icon: Icon, className, id, ...props }, ref) => {
    const reactId = useId();
    const textareaId = id || reactId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-[#E8E8ED] mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-3 text-[#8888A0] pointer-events-none">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <textarea
            ref={ref}
            id={textareaId}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg bg-[#0A0A0F] border border-[#262630] text-[#E8E8ED] placeholder:text-[#8888A0] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E8580C] focus:border-[#E8580C] disabled:opacity-50 disabled:cursor-not-allowed resize-y min-h-[100px]',
              Icon && 'pl-11',
              error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
