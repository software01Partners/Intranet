'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Search, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { TrailForm } from './TrailForm';
import { Card, CardContent } from '@/components/ui/Card';
import type { Trail, TrailType, Area, User } from '@/lib/types';

interface TrailWithCounts extends Trail {
  modulesCount: number;
  creatorName: string | null;
  areaName: string | null;
}

interface TrailsManagerProps {
  areaFilter: string | null; // Se presente, filtra por área (modo gestor)
  userRole: 'gestor' | 'admin';
}

export function TrailsManager({ areaFilter, userRole }: TrailsManagerProps) {
  const supabase = createClient();
  const [trails, setTrails] = useState<TrailWithCounts[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TrailType | 'all'>('all');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTrail, setEditingTrail] = useState<Trail | null>(null);
  const [deletingTrailId, setDeletingTrailId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; areaId: string | null } | null>(null);

  // Buscar dados iniciais
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Buscar usuário atual
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          toast.error('Erro', { description: 'Usuário não autenticado' });
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('id, area_id')
          .eq('id', session.user.id)
          .single();

        if (userData) {
          setCurrentUser({ id: userData.id, areaId: userData.area_id });
        }

        // Buscar áreas
        const { data: areasData, error: areasError } = await supabase
          .from('areas')
          .select('*')
          .order('name');

        if (areasError) throw areasError;
        setAreas(areasData || []);

        // Buscar usuários (para mostrar quem criou)
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .order('name');

        if (usersError) throw usersError;
        setUsers(usersData || []);

        // Buscar trilhas
        await fetchTrails(areasData || [], usersData || []);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast.error('Erro ao carregar dados', {
          description: error instanceof Error ? error.message : 'Erro inesperado',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [areaFilter]);

  // Buscar trilhas
  async function fetchTrails(areasData?: Area[], usersData?: User[]) {
    try {
      let query = supabase.from('trails').select('*');

      // Se areaFilter presente, filtrar por área (modo gestor)
      if (areaFilter) {
        query = query.eq('area_id', areaFilter);
      }

      const { data: trailsData, error: trailsError } = await query.order('created_at', {
        ascending: false,
      });

      if (trailsError) throw trailsError;

      if (!trailsData || trailsData.length === 0) {
        setTrails([]);
        return;
      }

      // Buscar contagem de módulos por trilha
      const trailIds = trailsData.map((t) => t.id);
      const { data: modulesData } = await supabase
        .from('modules')
        .select('trail_id')
        .in('trail_id', trailIds);

      // Criar mapa de contagem de módulos
      const modulesCountMap = new Map<string, number>();
      if (modulesData) {
        modulesData.forEach((module) => {
          const count = modulesCountMap.get(module.trail_id) || 0;
          modulesCountMap.set(module.trail_id, count + 1);
        });
      }

      // Usar áreas e usuários passados como parâmetro ou do estado
      const areasToUse = areasData || areas;
      const usersToUse = usersData || users;

      // Criar mapa de nomes de áreas
      const areasMap = new Map<string, string>();
      areasToUse.forEach((area) => {
        areasMap.set(area.id, area.name);
      });

      // Criar mapa de nomes de usuários
      const usersMap = new Map<string, string>();
      usersToUse.forEach((user) => {
        usersMap.set(user.id, user.name || user.email);
      });

      // Montar dados completos
      const trailsWithCounts: TrailWithCounts[] = trailsData.map((trail) => ({
        ...(trail as Trail),
        modulesCount: modulesCountMap.get(trail.id) || 0,
        creatorName: usersMap.get(trail.created_by) || null,
        areaName: trail.area_id ? areasMap.get(trail.area_id) || null : null,
      }));

      setTrails(trailsWithCounts);
    } catch (error) {
      console.error('Erro ao buscar trilhas:', error);
      toast.error('Erro ao buscar trilhas', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      });
    }
  }

  // Filtrar trilhas
  const filteredTrails = useMemo(() => {
    return trails.filter((trail) => {
      // Filtro por busca
      if (searchTerm && !trail.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Filtro por tipo
      if (typeFilter !== 'all' && trail.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [trails, searchTerm, typeFilter]);

  // Abrir modal de criação
  const handleCreate = () => {
    setEditingTrail(null);
    setIsFormModalOpen(true);
  };

  // Abrir modal de edição
  const handleEdit = (trail: Trail) => {
    setEditingTrail(trail);
    setIsFormModalOpen(true);
  };

  // Fechar modal
  const handleCloseModal = () => {
    setIsFormModalOpen(false);
    setEditingTrail(null);
  };

  // Sucesso no form
  const handleFormSuccess = () => {
    handleCloseModal();
    fetchTrails();
  };

  // Excluir trilha
  const handleDelete = async (trailId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta trilha?')) {
      return;
    }

    try {
      setDeletingTrailId(trailId);
      const { error } = await supabase.from('trails').delete().eq('id', trailId);

      if (error) throw error;

      toast.success('Trilha excluída com sucesso!');
      await fetchTrails();
    } catch (error) {
      console.error('Erro ao excluir trilha:', error);
      toast.error('Erro ao excluir trilha', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      });
    } finally {
      setDeletingTrailId(null);
    }
  };

  // Função para obter badge do tipo
  const getTypeBadge = (type: TrailType) => {
    switch (type) {
      case 'obrigatoria_global':
        return <Badge color="red">Obrigatória Global</Badge>;
      case 'obrigatoria_area':
        return <Badge color="blue">Obrigatória da Área</Badge>;
      case 'optativa':
        return <Badge color="green">Optativa</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const typeOptions = [
    { value: 'all', label: 'Todos os tipos' },
    { value: 'obrigatoria_global', label: 'Obrigatória Global' },
    { value: 'obrigatoria_area', label: 'Obrigatória da Área' },
    { value: 'optativa', label: 'Optativa' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8580C]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com botão Nova Trilha */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#E8E8ED]">
            {areaFilter ? 'Trilhas da Minha Área' : 'Gerenciar Trilhas'}
          </h2>
          <p className="text-sm text-[#8888A0] mt-1">
            {filteredTrails.length} trilha{filteredTrails.length !== 1 ? 's' : ''} encontrada
            {filteredTrails.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleCreate} icon={Plus}>
          Nova Trilha
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={Search}
              />
            </div>
            <div className="w-64">
              <Select
                options={typeOptions}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TrailType | 'all')}
                placeholder="Filtrar por tipo"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0A0A0F] border-b border-[#262630]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#8888A0] uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#8888A0] uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#8888A0] uppercase tracking-wider">
                    Área
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#8888A0] uppercase tracking-wider">
                    Módulos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#8888A0] uppercase tracking-wider">
                    Criado por
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#8888A0] uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262630]">
                {filteredTrails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-[#8888A0]">
                        {searchTerm || typeFilter !== 'all'
                          ? 'Nenhuma trilha encontrada com os filtros aplicados'
                          : 'Nenhuma trilha cadastrada'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTrails.map((trail) => (
                    <tr
                      key={trail.id}
                      className="hover:bg-[#0A0A0F]/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-[#E8E8ED]">{trail.name}</p>
                          {trail.description && (
                            <p className="text-xs text-[#8888A0] mt-1 line-clamp-1">
                              {trail.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getTypeBadge(trail.type)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#E8E8ED]">
                          {trail.areaName || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#E8E8ED]">{trail.modulesCount}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#8888A0]">
                          {trail.creatorName || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(trail)}
                            icon={Edit}
                            className="h-8 w-8 p-0"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(trail.id)}
                            icon={Trash2}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            disabled={deletingTrailId === trail.id}
                            loading={deletingTrailId === trail.id}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal do Formulário */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={handleCloseModal}
        title={editingTrail ? 'Editar Trilha' : 'Nova Trilha'}
        size="lg"
      >
        {currentUser && (
          <TrailForm
            initialData={editingTrail || undefined}
            userRole={userRole}
            userAreaId={currentUser.areaId}
            areas={areas}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseModal}
          />
        )}
      </Modal>
    </div>
  );
}
