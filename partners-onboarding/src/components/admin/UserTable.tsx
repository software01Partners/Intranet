'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { UserPlus, Search, ChevronLeft, ChevronRight, Edit2, Trash2, X } from 'lucide-react';
import { formatDate, calculateProgress } from '@/lib/utils';
import type { User, Area, UserRole } from '@/lib/types';
import Image from 'next/image';

interface UserWithProgress extends User {
  area?: Area | null;
  area_ids?: string[];
  areas?: Area[];
  overallProgress: number;
}

interface InviteFormData {
  name: string;
  email: string;
  area_ids: string[];
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
    area_ids: [],
    role: 'colaborador',
  });

  // Estados para editar usuário
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithProgress | null>(null);
  const [editForm, setEditForm] = useState({ name: '', area_ids: [] as string[], role: '' as UserRole });

  // Estados para excluir usuário
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserWithProgress | null>(null);

  // Estado para confirmação de mudança de role
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ userId: string; userName: string; oldRole: UserRole; newRole: UserRole } | null>(null);

  // Buscar usuários e áreas via API
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/users');
        if (!res.ok) throw new Error('Erro ao buscar usuários');
        const data = await res.json();
        setUsers(data.users as UserWithProgress[]);
        setAreas(data.areas as Area[]);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        toast.error('Erro ao carregar usuários', {
          description: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filtrar usuários
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Filtro por busca
      const matchesSearch =
        searchTerm === '' ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por área
      const userAreaIds = user.area_ids || (user.area_id ? [user.area_id] : []);
      const matchesArea =
        selectedArea === 'all' ||
        (selectedArea === 'null' && userAreaIds.length === 0) ||
        userAreaIds.includes(selectedArea);

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

  // Solicitar confirmação de mudança de role
  const handleRequestRoleChange = (userId: string, newRole: UserRole) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser || targetUser.role === newRole) return;
    setRoleChangeTarget({ userId, userName: targetUser.name, oldRole: targetUser.role, newRole });
    setIsRoleModalOpen(true);
  };

  // Atualizar role (após confirmação) via API
  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

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

  // Atualizar área via API
  const handleUpdateArea = async (userId: string, newAreaId: string | null) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, area_id: newAreaId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

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

  // Abrir modal de edição
  const handleOpenEdit = (user: UserWithProgress) => {
    setEditingUser(user);
    setEditForm({ name: user.name, area_ids: user.area_ids || (user.area_id ? [user.area_id] : []), role: user.role });
    setIsEditModalOpen(true);
  };

  // Salvar edição
  const handleSaveEdit = async () => {
    if (!editingUser || !editForm.name.trim()) return;

    setEditLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          name: editForm.name.trim(),
          area_ids: editForm.area_ids,
          role: editForm.role,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const newAreas = areas.filter((a) => editForm.area_ids.includes(a.id));

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, name: editForm.name.trim(), area_ids: editForm.area_ids, areas: newAreas, area_id: editForm.area_ids[0] || null, area: newAreas[0] || null, role: editForm.role }
            : u
        )
      );

      toast.success('Usuário atualizado com sucesso!');
      setIsEditModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      toast.error('Erro ao atualizar usuário', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setEditLoading(false);
    }
  };

  // Abrir modal de exclusão
  const handleOpenDelete = (user: UserWithProgress) => {
    setDeletingUser(user);
    setIsDeleteModalOpen(true);
  };

  // Confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    setDeleteLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingUser.id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      toast.success(`Usuário ${deletingUser.name} excluído com sucesso!`);
      setIsDeleteModalOpen(false);
      setDeletingUser(null);
    } catch (error) {
      toast.error('Erro ao excluir usuário', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Enviar convite
  const handleInvite = async () => {
    if (!inviteForm.name || !inviteForm.email || inviteForm.area_ids.length === 0) {
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
        area_ids: [],
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
            <p className="text-[#7A7468] dark:text-[#9A9590]">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E0DCD6] dark:border-[#3D3D3D]">
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#7A7468] dark:text-[#9A9590]">
                    Usuário
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#7A7468] dark:text-[#9A9590]">
                    Área
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#7A7468] dark:text-[#9A9590]">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#7A7468] dark:text-[#9A9590]">
                    Data de Cadastro
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#7A7468] dark:text-[#9A9590]">
                    Progresso Geral
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#7A7468] dark:text-[#9A9590]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#E0DCD6] dark:border-[#3D3D3D] hover:bg-[#F5F3EF] dark:hover:bg-[#3D3D3D]/50 transition-colors"
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
                          <div className="w-10 h-10 rounded-full bg-[#E0DCD6] dark:bg-[#3D3D3D] flex items-center justify-center text-[#2D2A26] dark:text-[#E8E5E0] font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-[#2D2A26] dark:text-[#E8E5E0] font-medium">{user.name}</p>
                          <p className="text-sm text-[#7A7468] dark:text-[#9A9590]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(user.areas && user.areas.length > 0) ? (
                        <div className="flex flex-wrap gap-1">
                          {user.areas.map((area) => (
                            <Badge
                              key={area.id}
                              color={
                                area.color === '#3B82F6'
                                  ? 'blue'
                                  : area.color === '#10B981'
                                  ? 'green'
                                  : area.color === '#991D7D'
                                  ? 'purple'
                                  : 'accent'
                              }
                            >
                              {area.name}
                            </Badge>
                          ))}
                        </div>
                      ) : user.area ? (
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
                        <span className="text-[#7A7468] dark:text-[#9A9590] text-sm">Sem área</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRequestRoleChange(user.id, e.target.value as UserRole)
                        }
                        className="bg-[#F5F3EF] dark:bg-[#1A1A1A] border border-[#E0DCD6] dark:border-[#3D3D3D] rounded-xl px-3 py-1.5 text-sm text-[#2D2A26] dark:text-[#E8E5E0] focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/30 dark:focus:ring-[#34D399]/30 cursor-pointer"
                      >
                        {roleSelectOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#7A7468] dark:text-[#9A9590]">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32">
                        <ProgressBar value={user.overallProgress} size="sm" />
                        <span className="text-xs text-[#7A7468] dark:text-[#9A9590] mt-1 block">
                          {user.overallProgress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-2 rounded-lg text-[#7A7468] dark:text-[#9A9590] hover:text-[#6B2FA0] dark:hover:text-[#B87FD8] hover:bg-[#6B2FA0]/10 dark:hover:bg-[#B87FD8]/10 transition-colors"
                          title="Editar usuário"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(user)}
                          className="p-2 rounded-lg text-[#7A7468] dark:text-[#9A9590] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Excluir usuário"
                        >
                          <Trash2 size={16} />
                        </button>
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
          <div className="px-6 py-4 border-t border-[#E0DCD6] dark:border-[#3D3D3D] flex items-center justify-between">
            <p className="text-sm text-[#7A7468] dark:text-[#9A9590]">
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
              <span className="text-sm text-[#7A7468] dark:text-[#9A9590] px-4">
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

          <MultiSelect
            label="Áreas"
            options={areas.map((a) => ({ value: a.id, label: a.name }))}
            value={inviteForm.area_ids}
            onChange={(ids) => setInviteForm((prev) => ({ ...prev, area_ids: ids }))}
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
              disabled={!inviteForm.name || !inviteForm.email || inviteForm.area_ids.length === 0}
            >
              Enviar Convite
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Edição */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingUser(null); }}
        title="Editar Usuário"
        description={editingUser ? `Editando ${editingUser.name}` : ''}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            placeholder="Nome completo"
            value={editForm.name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />

          <MultiSelect
            label="Áreas"
            options={areas.map((a) => ({ value: a.id, label: a.name }))}
            value={editForm.area_ids}
            onChange={(ids) => setEditForm((prev) => ({ ...prev, area_ids: ids }))}
          />

          <Select
            label="Role"
            value={editForm.role}
            onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
            options={roleSelectOptions}
          />

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => { setIsEditModalOpen(false); setEditingUser(null); }}
              disabled={editLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              loading={editLoading}
              disabled={!editForm.name.trim()}
            >
              Salvar Alterações
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setDeletingUser(null); }}
        title="Excluir Usuário"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[#2D2A26] dark:text-[#E8E5E0]">
            Tem certeza que deseja excluir o usuário{' '}
            <strong>{deletingUser?.name}</strong>?
          </p>
          <p className="text-sm text-[#7A7468] dark:text-[#9A9590]">
            Esta ação é irreversível. Todo o progresso, certificados e notificações do usuário serão removidos permanentemente.
          </p>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => { setIsDeleteModalOpen(false); setDeletingUser(null); }}
              disabled={deleteLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              loading={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600"
            >
              Excluir Usuário
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmação de Mudança de Role */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => { setIsRoleModalOpen(false); setRoleChangeTarget(null); }}
        title="Alterar Role"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[#2D2A26] dark:text-[#E8E5E0]">
            Tem certeza que deseja alterar a role de{' '}
            <strong>{roleChangeTarget?.userName}</strong> de{' '}
            <strong>{roleChangeTarget?.oldRole}</strong> para{' '}
            <strong>{roleChangeTarget?.newRole}</strong>?
          </p>
          {roleChangeTarget?.oldRole === 'admin' && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Atenção: o usuário perderá acesso às funcionalidades de administrador.
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => { setIsRoleModalOpen(false); setRoleChangeTarget(null); }}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (roleChangeTarget) {
                  await handleUpdateRole(roleChangeTarget.userId, roleChangeTarget.newRole);
                  setIsRoleModalOpen(false);
                  setRoleChangeTarget(null);
                }
              }}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
