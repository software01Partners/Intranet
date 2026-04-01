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
      <div className="flex gap-2 border-b border-[#E0DCD6] dark:border-[#3D3D3D]">
        <button
          onClick={() => onFilterTypeChange('all')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
            filterType === 'all'
              ? 'text-[#1B4D3E] dark:text-[#34D399] border-[#1B4D3E] dark:border-[#34D399]'
              : 'text-[#7A7468] dark:text-[#9A9590] border-transparent hover:text-[#2D2A26] dark:hover:text-[#E8E5E0]'
          )}
        >
          Todas
        </button>
        <button
          onClick={() => onFilterTypeChange('required')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
            filterType === 'required'
              ? 'text-[#1B4D3E] dark:text-[#34D399] border-[#1B4D3E] dark:border-[#34D399]'
              : 'text-[#7A7468] dark:text-[#9A9590] border-transparent hover:text-[#2D2A26] dark:hover:text-[#E8E5E0]'
          )}
        >
          Obrigatórias
        </button>
        <button
          onClick={() => onFilterTypeChange('optional')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
            filterType === 'optional'
              ? 'text-[#1B4D3E] dark:text-[#34D399] border-[#1B4D3E] dark:border-[#34D399]'
              : 'text-[#7A7468] dark:text-[#9A9590] border-transparent hover:text-[#2D2A26] dark:hover:text-[#E8E5E0]'
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
