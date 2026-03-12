'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

export type FilterType = 'all' | 'required' | 'optional';

interface TrailFiltersProps {
  filterType: FilterType;
  onFilterTypeChange: (type: FilterType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function TrailFilters({
  filterType,
  onFilterTypeChange,
  searchQuery,
  onSearchChange,
}: TrailFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-[#E2E5F1] dark:border-[#2D2D4A]">
        <button
          onClick={() => onFilterTypeChange('all')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
            filterType === 'all'
              ? 'text-[#6B2FA0] dark:text-[#8B5CF6] border-[#6B2FA0] dark:border-[#8B5CF6]'
              : 'text-[#6B7194] dark:text-[#8888A0] border-transparent hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED]'
          )}
        >
          Todas
        </button>
        <button
          onClick={() => onFilterTypeChange('required')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
            filterType === 'required'
              ? 'text-[#6B2FA0] dark:text-[#8B5CF6] border-[#6B2FA0] dark:border-[#8B5CF6]'
              : 'text-[#6B7194] dark:text-[#8888A0] border-transparent hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED]'
          )}
        >
          Obrigatórias
        </button>
        <button
          onClick={() => onFilterTypeChange('optional')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
            filterType === 'optional'
              ? 'text-[#6B2FA0] dark:text-[#8B5CF6] border-[#6B2FA0] dark:border-[#8B5CF6]'
              : 'text-[#6B7194] dark:text-[#8888A0] border-transparent hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED]'
          )}
        >
          Optativas
        </button>
      </div>

      <Input
        icon={Search}
        placeholder="Buscar por nome ou descrição..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-md"
      />
    </div>
  );
}
