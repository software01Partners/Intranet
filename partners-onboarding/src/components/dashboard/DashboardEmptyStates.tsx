'use client';

import { EmptyState } from '@/components/ui/EmptyState';
import { BookOpen } from 'lucide-react';

export function EmptyLastModule() {
  return (
    <EmptyState
      icon={BookOpen}
      title="Nada em andamento"
      description="Você ainda não iniciou nenhum módulo. Explore as trilhas disponíveis para começar!"
      actionLabel="Ver trilhas"
      onAction={() => (window.location.href = '/trilhas')}
    />
  );
}

export function EmptyRequiredTrails() {
  return (
    <EmptyState
      icon={BookOpen}
      title="Nenhuma trilha obrigatória"
      description="Não há trilhas obrigatórias disponíveis no momento."
    />
  );
}
