'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AreaForm } from './AreaForm';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Area } from '@/lib/types';

interface AreaWithCounts extends Area {
  usersCount: number;
  trailsCount: number;
}

export function AreasManager() {
  const supabase = createClient();
  const [areas, setAreas] = useState<AreaWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [deletingAreaId, setDeletingAreaId] = useState<string | null>(null);

  // Buscar áreas com contagens
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const { data: areasData, error: areasError } = await supabase
          .from('areas')
          .select('*')
          .order('name');

        if (cancelled) return;
        if (areasError) throw areasError;

        if (!areasData || areasData.length === 0) {
          setAreas([]);
          setLoading(false);
          return;
        }

        const areaIds = areasData.map((a) => a.id);
        const [{ data: usersData }, { data: trailAreasData }] = await Promise.all([
          supabase.from('users').select('area_id').in('area_id', areaIds),
          supabase.from('trail_areas').select('area_id').in('area_id', areaIds),
        ]);

        if (cancelled) return;

        const usersCountMap = new Map<string, number>();
        if (usersData) {
          usersData.forEach((user) => {
            if (user.area_id) {
              usersCountMap.set(user.area_id, (usersCountMap.get(user.area_id) || 0) + 1);
            }
          });
        }

        const trailsCountMap = new Map<string, number>();
        if (trailAreasData) {
          trailAreasData.forEach((ta) => {
            if (ta.area_id) {
              trailsCountMap.set(ta.area_id, (trailsCountMap.get(ta.area_id) || 0) + 1);
            }
          });
        }

        const areasWithCounts: AreaWithCounts[] = areasData.map((area) => ({
          ...area,
          usersCount: usersCountMap.get(area.id) || 0,
          trailsCount: trailsCountMap.get(area.id) || 0,
        }));

        setAreas(areasWithCounts);
      } catch (error) {
        if (cancelled) return;
        console.error('Erro ao buscar áreas:', error);
        toast.error('Erro ao carregar áreas', {
          description: error instanceof Error ? error.message : 'Erro inesperado',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refetchAreas() {
    try {
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*')
        .order('name');

      if (areasError) throw areasError;

      if (!areasData || areasData.length === 0) {
        setAreas([]);
        return;
      }

      const areaIds = areasData.map((a) => a.id);
      const [{ data: usersData }, { data: trailAreasData }] = await Promise.all([
        supabase.from('users').select('area_id').in('area_id', areaIds),
        supabase.from('trail_areas').select('area_id').in('area_id', areaIds),
      ]);

      const usersCountMap = new Map<string, number>();
      if (usersData) {
        usersData.forEach((user) => {
          if (user.area_id) {
            usersCountMap.set(user.area_id, (usersCountMap.get(user.area_id) || 0) + 1);
          }
        });
      }

      const trailsCountMap = new Map<string, number>();
      if (trailAreasData) {
        trailAreasData.forEach((ta) => {
          if (ta.area_id) {
            trailsCountMap.set(ta.area_id, (trailsCountMap.get(ta.area_id) || 0) + 1);
          }
        });
      }

      setAreas(areasData.map((area) => ({
        ...area,
        usersCount: usersCountMap.get(area.id) || 0,
        trailsCount: trailsCountMap.get(area.id) || 0,
      })));
    } catch (error) {
      console.error('Erro ao buscar áreas:', error);
      toast.error('Erro ao carregar áreas', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      });
    }
  }

  const handleOpenCreateModal = () => {
    setEditingArea(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (area: Area) => {
    setEditingArea(area);
    setIsFormModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsFormModalOpen(false);
    setEditingArea(null);
  };

  const handleFormSuccess = async () => {
    handleCloseModal();
    await refetchAreas();
  };

  const handleDelete = async (areaId: string) => {
    try {
      // Verificar se a área tem usuários ou trilhas vinculados
      const area = areas.find((a) => a.id === areaId);
      if (!area) return;

      if (area.usersCount > 0 || area.trailsCount > 0) {
        toast.error('Não é possível excluir esta área', {
          description: `A área possui ${area.usersCount} colaborador(es) e ${area.trailsCount} trilha(s) vinculado(s). Remova essas vinculações antes de excluir.`,
        });
        setDeletingAreaId(null);
        return;
      }

      const response = await fetch('/api/admin/soft-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: areaId, entity_type: 'area' }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao excluir área');
      }

      toast.success('Área movida para a lixeira!');
      // Atualização otimista: remove a área da lista imediatamente (evita depender do refetch)
      setAreas((prev) => prev.filter((a) => a.id !== areaId));
    } catch (error) {
      console.error('Erro ao excluir área:', error);
      toast.error('Erro ao excluir área', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      });
    } finally {
      setDeletingAreaId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#2D2A26] dark:text-[#2D2A26] dark:text-[#E8E5E0]">
                Áreas Cadastradas
              </h2>
              <p className="text-sm text-[#7A7468] dark:text-[#7A7468] dark:text-[#9A9590] mt-1">
                {areas.length} {areas.length === 1 ? 'área' : 'áreas'} cadastrada{areas.length === 1 ? '' : 's'}
              </p>
            </div>
            <Button onClick={handleOpenCreateModal} icon={Plus}>
              Nova Área
            </Button>
          </div>

          {areas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#7A7468] dark:text-[#7A7468] dark:text-[#9A9590] mb-4">Nenhuma área cadastrada</p>
              <Button onClick={handleOpenCreateModal} icon={Plus}>
                Criar Primeira Área
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E0DCD6] dark:border-[#3D3D3D]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#7A7468] dark:text-[#9A9590]">
                      Cor
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#7A7468] dark:text-[#9A9590]">
                      Nome
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#7A7468] dark:text-[#9A9590]">
                      Abreviação
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#7A7468] dark:text-[#9A9590]">
                      Colaboradores
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#7A7468] dark:text-[#9A9590]">
                      Trilhas
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[#7A7468] dark:text-[#9A9590]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map((area) => (
                    <tr
                      key={area.id}
                      className="border-b border-[#E0DCD6] dark:border-[#3D3D3D] hover:bg-[#F5F3EF] dark:hover:bg-[#3D3D3D] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div
                          className="w-6 h-6 rounded-full border border-[#E0DCD6] dark:border-[#3D3D3D]"
                          style={{ backgroundColor: area.color }}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#2D2A26] dark:text-[#E8E5E0] font-medium">
                          {area.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#7A7468] dark:text-[#9A9590]">{area.abbreviation}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#2D2A26] dark:text-[#E8E5E0]">{area.usersCount}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#2D2A26] dark:text-[#E8E5E0]">{area.trailsCount}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditModal(area)}
                            icon={Edit2}
                            className="h-8 w-8 p-0"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Tem certeza que deseja mover a área "${area.name}" para a lixeira?`
                                )
                              ) {
                                setDeletingAreaId(area.id);
                                handleDelete(area.id);
                              }
                            }}
                            icon={Trash2}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            disabled={deletingAreaId === area.id}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de formulário */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={handleCloseModal}
        title={editingArea ? 'Editar Área' : 'Nova Área'}
        description={
          editingArea
            ? 'Atualize as informações da área'
            : 'Preencha os dados para criar uma nova área'
        }
        size="md"
      >
        <AreaForm
          initialData={editingArea || undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>
    </>
  );
}
