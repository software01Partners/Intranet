'use client';

import { useState, useMemo } from 'react';
import { TrailFilters, FilterType } from '@/components/dashboard/TrailFilters';
import { TrailCard } from '@/components/dashboard/TrailCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookOpen } from 'lucide-react';
import { Trail } from '@/lib/types';

interface TrailWithProgress extends Trail {
  totalModules: number;
  progress: number;
  areaName?: string | null;
}

interface TrailCatalogClientProps {
  trails: TrailWithProgress[];
}

export function TrailCatalogClient({ trails }: TrailCatalogClientProps) {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar trilhas
  const filteredTrails = useMemo(() => {
    let filtered = [...trails];

    // Filtro por tipo
    if (filterType === 'required') {
      filtered = filtered.filter(
        (trail) =>
          trail.type === 'obrigatoria_global' ||
          trail.type === 'obrigatoria_area'
      );
    } else if (filterType === 'optional') {
      filtered = filtered.filter(
        (trail) => trail.type === 'optativa_global' || trail.type === 'optativa_area'
      );
    }

    // Filtro por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (trail) =>
          trail.name.toLowerCase().includes(query) ||
          (trail.description &&
            trail.description.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [trails, filterType, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Barra de filtros */}
      <TrailFilters
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Grid de trilhas */}
      {filteredTrails.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma trilha encontrada"
          description={
            searchQuery.trim()
              ? 'Tente ajustar os filtros ou a busca para encontrar trilhas.'
              : 'Não há trilhas disponíveis no momento.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTrails.map((trail) => (
            <TrailCard key={trail.id} trail={trail} />
          ))}
        </div>
      )}
    </div>
  );
}
