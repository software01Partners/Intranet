'use client';

import { useState } from 'react';
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
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#262630]">
        <button
          onClick={() => onFilterTypeChange('all')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
            filterType === 'all'
              ? 'text-[#E8580C] border-[#E8580C]'
              : 'text-[#8888A0] border-transparent hover:text-[#E8E8ED]'
          )}
        >
          Todas
        </button>
        <button
          onClick={() => onFilterTypeChange('required')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
            filterType === 'required'
              ? 'text-[#E8580C] border-[#E8580C]'
              : 'text-[#8888A0] border-transparent hover:text-[#E8E8ED]'
          )}
        >
          Obrigatórias
        </button>
        <button
          onClick={() => onFilterTypeChange('optional')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
            filterType === 'optional'
              ? 'text-[#E8580C] border-[#E8580C]'
              : 'text-[#8888A0] border-transparent hover:text-[#E8E8ED]'
          )}
        >
          Optativas
        </button>
      </div>

      {/* Campo de busca */}
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
