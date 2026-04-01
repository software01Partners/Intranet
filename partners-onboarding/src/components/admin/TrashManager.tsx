'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { RotateCcw, Trash2, Loader2, BookOpen, FileVideo, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import type { TrashItem } from '@/lib/types';

type FilterType = 'all' | 'trail' | 'module' | 'area';

const entityLabels: Record<string, string> = {
  trail: 'Trilha',
  module: 'Módulo',
  area: 'Área',
};

const entityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  trail: BookOpen,
  module: FileVideo,
  area: Building2,
};

export function TrashManager() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTrash();
  }, []);

  async function fetchTrash() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/trash');
      if (!res.ok) throw new Error('Erro ao carregar lixeira');
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error('Erro ao carregar lixeira:', error);
      toast.error('Erro ao carregar lixeira');
    } finally {
      setLoading(false);
    }
  }

  const handleRestore = async (item: TrashItem) => {
    try {
      setRestoringId(item.id);
      const res = await fetch('/api/admin/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, entity_type: item.entity_type }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao restaurar');
      }

      toast.success(`${entityLabels[item.entity_type]} "${item.name}" restaurado(a) com sucesso!`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (error) {
      console.error('Erro ao restaurar:', error);
      toast.error('Erro ao restaurar item', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      });
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente "${item.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      setDeletingId(item.id);
      const res = await fetch(`/api/admin/trash?id=${item.id}&entity_type=${item.entity_type}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir');
      }

      toast.success(`"${item.name}" excluído permanentemente`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (error) {
      console.error('Erro ao excluir permanentemente:', error);
      toast.error('Erro ao excluir permanentemente', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.entity_type === filter);
  }, [items, filter]);

  const filterOptions = [
    { value: 'all', label: `Todos (${items.length})` },
    { value: 'trail', label: `Trilhas (${items.filter((i) => i.entity_type === 'trail').length})` },
    { value: 'module', label: `Módulos (${items.filter((i) => i.entity_type === 'module').length})` },
    { value: 'area', label: `Áreas (${items.filter((i) => i.entity_type === 'area').length})` },
  ];

  function formatDeletedDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getDaysColor(days: number) {
    if (days <= 3) return 'text-red-500';
    if (days <= 7) return 'text-orange-500';
    if (days <= 14) return 'text-yellow-400';
    return 'text-[#7A7468] dark:text-[#9A9590]';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B4D3E]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro */}
      <Card>
        <CardContent className="p-4">
          <div className="w-64">
            <Select
              label="Filtrar por tipo"
              options={filterOptions}
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <Trash2 className="w-12 h-12 text-[#7A7468] dark:text-[#9A9590] mx-auto mb-4 opacity-50" />
              <p className="text-[#7A7468] dark:text-[#9A9590] text-lg">
                {items.length === 0
                  ? 'A lixeira está vazia'
                  : 'Nenhum item encontrado com este filtro'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0A0A0F] border-b border-[#333333]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#7A7468] dark:text-[#9A9590] uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#7A7468] dark:text-[#9A9590] uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#7A7468] dark:text-[#9A9590] uppercase tracking-wider">
                      Excluído em
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#7A7468] dark:text-[#9A9590] uppercase tracking-wider">
                      Dias restantes
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#7A7468] dark:text-[#9A9590] uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333333]">
                  {filteredItems.map((item) => {
                    const Icon = entityIcons[item.entity_type];
                    return (
                      <tr
                        key={`${item.entity_type}-${item.id}`}
                        className="hover:bg-[#0A0A0F]/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 text-[#7A7468] dark:text-[#9A9590]" />
                            <span className="text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0]">
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge color={item.entity_type === 'trail' ? 'blue' : item.entity_type === 'module' ? 'green' : 'red'}>
                            {entityLabels[item.entity_type]}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-[#7A7468] dark:text-[#9A9590]">
                            {formatDeletedDate(item.deleted_at)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${getDaysColor(item.days_remaining)}`}>
                            {item.days_remaining} {item.days_remaining === 1 ? 'dia' : 'dias'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(item)}
                              icon={RotateCcw}
                              className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                              disabled={restoringId === item.id}
                              loading={restoringId === item.id}
                            >
                              Restaurar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePermanentDelete(item)}
                              icon={Trash2}
                              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                              disabled={deletingId === item.id}
                              loading={deletingId === item.id}
                            >
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
