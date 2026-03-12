'use client';

import { useState, useEffect, useMemo } from 'react';
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
    fetchAreas();
  }, []);

  async function fetchAreas() {
    try {
      setLoading(true);

      // Buscar todas as áreas
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*')
        .order('name');

      if (areasError) throw areasError;

      if (!areasData || areasData.length === 0) {
        setAreas([]);
        setLoading(false);
        return;
      }

      // Buscar contagem de usuários por área
      const areaIds = areasData.map((a) => a.id);
      const { data: usersData } = await supabase
        .from('users')
        .select('area_id')
        .in('area_id', areaIds);

      // Buscar contagem de trilhas por área
      const { data: trailsData } = await supabase
        .from('trails')
        .select('area_id')
        .in('area_id', areaIds);

      // Criar mapas de contagem
      const usersCountMap = new Map<string, number>();
      if (usersData) {
        usersData.forEach((user) => {
          if (user.area_id) {
            const count = usersCountMap.get(user.area_id) || 0;
            usersCountMap.set(user.area_id, count + 1);
          }
        });
      }

      const trailsCountMap = new Map<string, number>();
      if (trailsData) {
        trailsData.forEach((trail) => {
          if (trail.area_id) {
            const count = trailsCountMap.get(trail.area_id) || 0;
            trailsCountMap.set(trail.area_id, count + 1);
          }
        });
      }

      // Montar áreas com contagens
      const areasWithCounts: AreaWithCounts[] = areasData.map((area) => ({
        ...area,
        usersCount: usersCountMap.get(area.id) || 0,
        trailsCount: trailsCountMap.get(area.id) || 0,
      }));

      setAreas(areasWithCounts);
    } catch (error) {
      console.error('Erro ao buscar áreas:', error);
      toast.error('Erro ao carregar áreas', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      });
    } finally {
      setLoading(false);
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

  const handleFormSuccess = () => {
    handleCloseModal();
    fetchAreas();
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

      const { error } = await supabase.from('areas').delete().eq('id', areaId);

      if (error) throw error;

      toast.success('Área excluída com sucesso!');
      fetchAreas();
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
              <h2 className="text-xl font-semibold text-[#E8E8ED]">
                Áreas Cadastradas
              </h2>
              <p className="text-sm text-[#8888A0] mt-1">
                {areas.length} {areas.length === 1 ? 'área' : 'áreas'} cadastrada{areas.length === 1 ? '' : 's'}
              </p>
            </div>
            <Button onClick={handleOpenCreateModal} icon={Plus}>
              Nova Área
            </Button>
          </div>

          {areas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#8888A0] mb-4">Nenhuma área cadastrada</p>
              <Button onClick={handleOpenCreateModal} icon={Plus}>
                Criar Primeira Área
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#262630]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#8888A0]">
                      Cor
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#8888A0]">
                      Nome
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#8888A0]">
                      Abreviação
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#8888A0]">
                      Colaboradores
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[#8888A0]">
                      Trilhas
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[#8888A0]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map((area) => (
                    <tr
                      key={area.id}
                      className="border-b border-[#262630] hover:bg-[#13131A] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div
                          className="w-6 h-6 rounded-full border border-[#262630]"
                          style={{ backgroundColor: area.color }}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#E8E8ED] font-medium">
                          {area.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#8888A0]">{area.abbreviation}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#E8E8ED]">{area.usersCount}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#E8E8ED]">{area.trailsCount}</span>
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
                                  `Tem certeza que deseja excluir a área "${area.name}"?`
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
