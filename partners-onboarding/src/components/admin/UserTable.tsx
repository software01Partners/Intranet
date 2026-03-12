'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { UserPlus, Search, ChevronLeft, ChevronRight, Edit2, X } from 'lucide-react';
import { formatDate, calculateProgress } from '@/lib/utils';
import type { User, Area, UserRole } from '@/lib/types';
import Image from 'next/image';

interface UserWithProgress extends User {
  area?: Area | null;
  overallProgress: number;
}

interface InviteFormData {
  name: string;
  email: string;
  area_id: string;
  role: UserRole;
}

const ITEMS_PER_PAGE = 10;

export function UserTable() {
  const [users, setUsers] = useState<UserWithProgress[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormData>({
    name: '',
    email: '',
    area_id: '',
    role: 'colaborador',
  });

  const supabase = createClient();

  // Buscar áreas
  useEffect(() => {
    async function fetchAreas() {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .order('name');

      if (error) {
        toast.error('Erro ao carregar áreas', {
          description: error.message,
        });
      } else if (data) {
        setAreas(data as Area[]);
      }
    }

    fetchAreas();
  }, [supabase]);

  // Buscar usuários e calcular progresso
  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        // Buscar todos os usuários
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (usersError) {
          throw usersError;
        }

        if (!usersData || usersData.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        // Buscar áreas dos usuários
        const areaIds = usersData
          .map((u) => u.area_id)
          .filter((id): id is string => id !== null);

        const areasMap = new Map<string, Area>();
        if (areaIds.length > 0) {
          const { data: areasData } = await supabase
            .from('areas')
            .select('*')
            .in('id', areaIds);

          if (areasData) {
            areasData.forEach((area) => {
              areasMap.set(area.id, area as Area);
            });
          }
        }

        // Buscar todos os módulos para calcular progresso
        const { data: allModules } = await supabase
          .from('modules')
          .select('id');

        const totalModules = allModules?.length || 0;

        // Para cada usuário, calcular progresso geral
        const usersWithProgress: UserWithProgress[] = await Promise.all(
          usersData.map(async (user) => {
            let overallProgress = 0;

            if (totalModules > 0) {
              const { data: userProgress } = await supabase
                .from('user_progress')
                .select('module_id, completed')
                .eq('user_id', user.id);

              const completedModules =
                userProgress?.filter((up) => up.completed).length || 0;
              overallProgress = calculateProgress(completedModules, totalModules);
            }

            return {
              ...(user as User),
              area: user.area_id ? areasMap.get(user.area_id) || null : null,
              overallProgress,
            };
          })
        );

        setUsers(usersWithProgress);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        toast.error('Erro ao carregar usuários', {
          description: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [supabase]);

  // Filtrar usuários
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Filtro por busca
      const matchesSearch =
        searchTerm === '' ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por área
      const matchesArea =
        selectedArea === 'all' ||
        (selectedArea === 'null' && user.area_id === null) ||
        user.area_id === selectedArea;

      // Filtro por role
      const matchesRole = selectedRole === 'all' || user.role === selectedRole;

      return matchesSearch && matchesArea && matchesRole;
    });
  }, [users, searchTerm, selectedArea, selectedRole]);

  // Paginação
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, currentPage]);

  // Atualizar role
  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      toast.success('Role atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      toast.error('Erro ao atualizar role', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  // Atualizar área
  const handleUpdateArea = async (userId: string, newAreaId: string | null) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ area_id: newAreaId })
        .eq('id', userId);

      if (error) throw error;

      const newArea = newAreaId
        ? areas.find((a) => a.id === newAreaId) || null
        : null;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, area_id: newAreaId, area: newArea } : u))
      );

      toast.success('Área atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar área:', error);
      toast.error('Erro ao atualizar área', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  // Enviar convite
  const handleInvite = async () => {
    if (!inviteForm.name || !inviteForm.email || !inviteForm.area_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteForm.email)) {
      toast.error('Email inválido');
      return;
    }

    setInviteLoading(true);

    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar convite');
      }

      toast.success(`Convite enviado para ${inviteForm.email}!`);
      setIsInviteModalOpen(false);
      setInviteForm({
        name: '',
        email: '',
        area_id: '',
        role: 'colaborador',
      });

      // Recarregar usuários
      window.location.reload();
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      toast.error('Erro ao enviar convite', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole): 'accent' | 'blue' | 'purple' => {
    switch (role) {
      case 'admin':
        return 'accent';
      case 'gestor':
        return 'purple';
      case 'colaborador':
        return 'blue';
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'gestor':
        return 'Gestor';
      case 'colaborador':
        return 'Colaborador';
    }
  };

  const areaOptions: SelectOption[] = [
    { value: 'all', label: 'Todas' },
    ...areas.map((area) => ({ value: area.id, label: area.name })),
    { value: 'null', label: 'Sem área' },
  ];

  const roleOptions: SelectOption[] = [
    { value: 'all', label: 'Todos' },
    { value: 'colaborador', label: 'Colaborador' },
    { value: 'gestor', label: 'Gestor' },
    { value: 'admin', label: 'Admin' },
  ];

  const roleSelectOptions: SelectOption[] = [
    { value: 'colaborador', label: 'Colaborador' },
    { value: 'gestor', label: 'Gestor' },
    { value: 'admin', label: 'Admin' },
  ];

  return (
    <div className="space-y-4">
      {/* Header com botão de convite */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Filtros */}
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                icon={Search}
              />
            </div>

            <div className="w-48">
              <Select
                value={selectedArea}
                onChange={(e) => {
                  setSelectedArea(e.target.value);
                  setCurrentPage(1);
                }}
                options={areaOptions}
                placeholder="Todas as áreas"
              />
            </div>

            <div className="w-48">
              <Select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setCurrentPage(1);
                }}
                options={roleOptions}
                placeholder="Todos os roles"
              />
            </div>
          </div>
        </div>

        <Button
          icon={UserPlus}
          iconPosition="left"
          onClick={() => setIsInviteModalOpen(true)}
        >
          Convidar Colaborador
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[#6B7194] dark:text-[#8888A0]">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E5F1] dark:border-[#2D2D4A]">
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#6B7194] dark:text-[#8888A0]">
                    Usuário
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#6B7194] dark:text-[#8888A0]">
                    Área
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#6B7194] dark:text-[#8888A0]">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#6B7194] dark:text-[#8888A0]">
                    Data de Cadastro
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#6B7194] dark:text-[#8888A0]">
                    Progresso Geral
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#6B7194] dark:text-[#8888A0]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#E2E5F1] dark:border-[#2D2D4A] hover:bg-[#F8F9FC] dark:hover:bg-[#2D2D4A]/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden">
                            <Image
                              src={user.avatar_url}
                              alt={user.name}
                              width={40}
                              height={40}
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#E2E5F1] dark:bg-[#2D2D4A] flex items-center justify-center text-[#1A1D2E] dark:text-[#E8E8ED] font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-[#1A1D2E] dark:text-[#E8E8ED] font-medium">{user.name}</p>
                          <p className="text-sm text-[#6B7194] dark:text-[#8888A0]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.area ? (
                        <Badge
                          color={
                            user.area.color === '#3B82F6'
                              ? 'blue'
                              : user.area.color === '#10B981'
                              ? 'green'
                              : user.area.color === '#991D7D'
                              ? 'purple'
                              : 'accent'
                          }
                        >
                          {user.area.name}
                        </Badge>
                      ) : (
                        <span className="text-[#6B7194] dark:text-[#8888A0] text-sm">Sem área</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleUpdateRole(user.id, e.target.value as UserRole)
                        }
                        className="bg-[#F8F9FC] dark:bg-[#0F0F1A] border border-[#E2E5F1] dark:border-[#2D2D4A] rounded-xl px-3 py-1.5 text-sm text-[#1A1D2E] dark:text-[#E8E8ED] focus:outline-none focus:ring-2 focus:ring-[#6B2FA0]/30 dark:focus:ring-[#8B5CF6]/30 cursor-pointer"
                      >
                        {roleSelectOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B7194] dark:text-[#8888A0]">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32">
                        <ProgressBar value={user.overallProgress} size="sm" />
                        <span className="text-xs text-[#6B7194] dark:text-[#8888A0] mt-1 block">
                          {user.overallProgress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={user.area_id || ''}
                          onChange={(e) =>
                            handleUpdateArea(
                              user.id,
                              e.target.value === '' ? null : e.target.value
                            )
                          }
                          className="bg-[#F8F9FC] dark:bg-[#0F0F1A] border border-[#E2E5F1] dark:border-[#2D2D4A] rounded-xl px-3 py-1.5 text-sm text-[#1A1D2E] dark:text-[#E8E8ED] focus:outline-none focus:ring-2 focus:ring-[#6B2FA0]/30 dark:focus:ring-[#8B5CF6]/30 cursor-pointer"
                        >
                          <option value="">Sem área</option>
                          {areas.map((area) => (
                            <option key={area.id} value={area.id}>
                              {area.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {!loading && filteredUsers.length > 0 && (
          <div className="px-6 py-4 border-t border-[#E2E5F1] dark:border-[#2D2D4A] flex items-center justify-between">
            <p className="text-sm text-[#6B7194] dark:text-[#8888A0]">
              Mostrando {paginatedUsers.length} de {filteredUsers.length} usuários
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                icon={ChevronLeft}
              >
                Anterior
              </Button>
              <span className="text-sm text-[#6B7194] dark:text-[#8888A0] px-4">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                icon={ChevronRight}
                iconPosition="right"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Convite */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Convidar Colaborador"
        description="Preencha os dados para enviar um convite"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            placeholder="Nome completo"
            value={inviteForm.name}
            onChange={(e) =>
              setInviteForm((prev) => ({ ...prev, name: e.target.value }))
            }
            required
          />

          <Input
            label="Email"
            type="email"
            placeholder="email@exemplo.com"
            value={inviteForm.email}
            onChange={(e) =>
              setInviteForm((prev) => ({ ...prev, email: e.target.value }))
            }
            required
          />

          <Select
            label="Área"
            value={inviteForm.area_id}
            onChange={(e) =>
              setInviteForm((prev) => ({ ...prev, area_id: e.target.value }))
            }
            options={areas.map((area) => ({
              value: area.id,
              label: area.name,
            }))}
            placeholder="Selecione uma área"
            required
          />

          <Select
            label="Role"
            value={inviteForm.role}
            onChange={(e) =>
              setInviteForm((prev) => ({
                ...prev,
                role: e.target.value as UserRole,
              }))
            }
            options={roleSelectOptions}
          />

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsInviteModalOpen(false)}
              disabled={inviteLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleInvite}
              loading={inviteLoading}
              disabled={!inviteForm.name || !inviteForm.email || !inviteForm.area_id}
            >
              Enviar Convite
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
