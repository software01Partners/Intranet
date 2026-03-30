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
import { formatDeadline, getDeadlineStatus } from '@/lib/utils';
import type { Trail, TrailType, Area, User } from '@/lib/types';

interface TrailWithCounts extends Trail {
  modulesCount: number;
  creatorName: string | null;
  areaNames: string[];
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
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);

        // Buscar usuário atual
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.user) {
          toast.error('Erro', { description: 'Usuário não autenticado' });
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('id, area_id')
          .eq('id', session.user.id)
          .single();

        if (cancelled) return;

        if (userData) {
          setCurrentUser({ id: userData.id, areaId: userData.area_id });
        }

        // Buscar áreas e usuários em paralelo
        const [areasResult, usersResult] = await Promise.all([
          supabase.from('areas').select('*').order('name'),
          supabase.from('users').select('*').order('name'),
        ]);

        if (cancelled) return;

        if (areasResult.error) throw areasResult.error;
        if (usersResult.error) throw usersResult.error;

        const areasData = areasResult.data || [];
        const usersData = usersResult.data || [];

        setAreas(areasData);
        setUsers(usersData);

        // Buscar trilhas
        await fetchTrails(areasData, usersData);
      } catch (error) {
        if (cancelled) return;
        console.error('Erro ao buscar dados:', error);
        toast.error('Erro ao carregar dados', {
          description: error instanceof Error ? error.message : 'Erro inesperado',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaFilter]);

  // Buscar trilhas
  async function fetchTrails(areasData?: Area[], usersData?: User[]) {
    try {
      const { data: trailsData, error: trailsError } = await supabase
        .from('trails')
        .select('*')
        .order('created_at', { ascending: false });

      if (trailsError) throw trailsError;

      if (!trailsData || trailsData.length === 0) {
        setTrails([]);
        return;
      }

      const trailIds = trailsData.map((t) => t.id);

      // Buscar trail_areas para todas as trilhas
      const { data: trailAreasData } = await supabase
        .from('trail_areas')
        .select('trail_id, area_id')
        .in('trail_id', trailIds);

      // Mapa: trail_id -> area_ids[]
      const trailAreasMap = new Map<string, string[]>();
      if (trailAreasData) {
        trailAreasData.forEach((ta) => {
          const existing = trailAreasMap.get(ta.trail_id) || [];
          existing.push(ta.area_id);
          trailAreasMap.set(ta.trail_id, existing);
        });
      }

      // Se areaFilter presente (modo gestor), filtrar trilhas que pertencem à área
      let filteredTrailsData = trailsData;
      if (areaFilter) {
        filteredTrailsData = trailsData.filter((trail) => {
          const trailAreaIds = trailAreasMap.get(trail.id) || [];
          return trailAreaIds.includes(areaFilter);
        });
      }

      if (filteredTrailsData.length === 0) {
        setTrails([]);
        return;
      }

      // Buscar contagem de módulos por trilha
      const filteredTrailIds = filteredTrailsData.map((t) => t.id);
      const { data: modulesData } = await supabase
        .from('modules')
        .select('trail_id')
        .in('trail_id', filteredTrailIds);

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
      const trailsWithCounts: TrailWithCounts[] = filteredTrailsData.map((trail) => {
        const areaIds = trailAreasMap.get(trail.id) || [];
        const areaNames = areaIds
          .map((aid) => areasMap.get(aid))
          .filter(Boolean) as string[];
        return {
          ...(trail as Trail),
          area_ids: areaIds,
          modulesCount: modulesCountMap.get(trail.id) || 0,
          creatorName: usersMap.get(trail.created_by) || null,
          areaNames,
        };
      });

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
    if (!confirm('Tem certeza que deseja mover esta trilha para a lixeira?')) {
      return;
    }

    try {
      setDeletingTrailId(trailId);
      const response = await fetch('/api/admin/soft-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: trailId, entity_type: 'trail' }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao excluir trilha');
      }

      toast.success('Trilha movida para a lixeira!');
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
      case 'optativa_global':
        return <Badge color="green">Optativa Global</Badge>;
      case 'optativa_area':
        return <Badge color="green">Optativa da Área</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const typeOptions = [
    { value: 'all', label: 'Todos os tipos' },
    { value: 'obrigatoria_global', label: 'Obrigatória Global' },
    { value: 'obrigatoria_area', label: 'Obrigatória da Área' },
    { value: 'optativa_global', label: 'Optativa Global' },
    { value: 'optativa_area', label: 'Optativa da Área' },
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
                    Prazo
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
                    <td colSpan={7} className="px-6 py-12 text-center">
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
                      <td className="px-6 py-4">
                        <span className="text-sm text-[#E8E8ED]">
                          {trail.areaNames.length > 0
                            ? trail.areaNames.join(', ')
                            : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#E8E8ED]">{trail.modulesCount}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {trail.deadline ? (() => {
                          const status = getDeadlineStatus(trail.deadline);
                          const colorClass =
                            status === 'overdue' ? 'text-red-500' :
                            status === 'urgent' ? 'text-orange-500' :
                            status === 'warning' ? 'text-yellow-400' :
                            'text-[#E8E8ED]';
                          return (
                            <span className={`text-sm font-medium ${colorClass}`}>
                              {formatDeadline(trail.deadline)}
                            </span>
                          );
                        })() : (
                          <span className="text-sm text-[#8888A0]">Sem prazo</span>
                        )}
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
