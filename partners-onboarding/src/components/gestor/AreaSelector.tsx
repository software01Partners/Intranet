'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui/Select';
import { Area } from '@/lib/types';

interface AreaSelectorProps {
  areas: Area[];
  selectedAreaId: string | null;
}

export function AreaSelector({ areas, selectedAreaId }: AreaSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleAreaChange = (areaId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (areaId === 'all') {
      params.delete('area');
    } else {
      params.set('area', areaId);
    }
    router.push(`/gestor?${params.toString()}`);
  };

  const options = [
    { value: 'all', label: 'Todas as áreas' },
    ...areas.map((area) => ({
      value: area.id,
      label: area.name,
    })),
  ];

  return (
    <div className="w-full max-w-xs">
      <Select
        label="Filtrar por área"
        value={selectedAreaId || 'all'}
        onChange={(e) => handleAreaChange(e.target.value)}
        options={options}
      />
    </div>
  );
}
