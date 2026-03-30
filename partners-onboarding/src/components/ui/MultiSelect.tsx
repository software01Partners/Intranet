'use client';

import { useId, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, X, Check } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  label?: string;
  error?: string;
  options: MultiSelectOption[];
  placeholder?: string;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function MultiSelect({
  label,
  error,
  options,
  placeholder = 'Selecione...',
  value,
  onChange,
  disabled,
  className,
  id,
}: MultiSelectProps) {
  const reactId = useId();
  const inputId = id || reactId;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionValue: string) => {
    if (disabled) return;
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeOption = (optionValue: string) => {
    if (disabled) return;
    onChange(value.filter((v) => v !== optionValue));
  };

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v))
    .filter(Boolean) as MultiSelectOption[];

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-[#1A1D2E] dark:text-[#E8E8ED] mb-2"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <div
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          aria-expanded={isOpen}
          id={inputId}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl bg-[#F8F9FC] dark:bg-[#0F0F1A] border border-[#E2E5F1] dark:border-[#2D2D4A] text-[#1A1D2E] dark:text-[#E8E8ED] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#6B2FA0]/30 dark:focus:ring-[#8B5CF6]/30 focus:border-[#6B2FA0] dark:focus:border-[#8B5CF6] cursor-pointer text-left min-h-[42px] pr-10',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'border-[#EF4444] focus:ring-[#EF4444]/30 focus:border-[#EF4444]',
            className
          )}
        >
          {selectedLabels.length === 0 ? (
            <span className="text-[#9CA3C4] dark:text-[#8888A0]">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedLabels.map((option) => (
                <span
                  key={option.value}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#6B2FA0]/10 dark:bg-[#8B5CF6]/15 text-[#6B2FA0] dark:text-[#8B5CF6] text-sm"
                >
                  {option.label}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOption(option.value);
                    }}
                    className="hover:bg-[#6B2FA0]/20 dark:hover:bg-[#8B5CF6]/25 rounded-full p-0.5"
                    disabled={disabled}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3C4] dark:text-[#8888A0] pointer-events-none">
          <ChevronDown className={cn('w-5 h-5 transition-transform', isOpen && 'rotate-180')} />
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 py-1 rounded-xl bg-white dark:bg-[#1A1A2E] border border-[#E2E5F1] dark:border-[#2D2D4A] shadow-lg max-h-60 overflow-y-auto">
            {options.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleOption(option.value)}
                  disabled={option.disabled}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors',
                    isSelected
                      ? 'bg-[#6B2FA0]/5 dark:bg-[#8B5CF6]/10 text-[#6B2FA0] dark:text-[#8B5CF6]'
                      : 'text-[#1A1D2E] dark:text-[#E8E8ED] hover:bg-[#F8F9FC] dark:hover:bg-[#0F0F1A]',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                      isSelected
                        ? 'bg-[#6B2FA0] dark:bg-[#8B5CF6] border-[#6B2FA0] dark:border-[#8B5CF6]'
                        : 'border-[#D1D5DB] dark:border-[#4A4A6A]'
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-[#EF4444] flex items-center gap-1">
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
