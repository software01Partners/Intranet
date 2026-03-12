'use client';

import { useState, useMemo, useEffect } from 'react';
import { TeamMember } from '@/app/(dashboard)/gestor/page';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { formatDate } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Image from 'next/image';

interface TeamTableProps {
  areaId: string | null;
}

type SortField = 'name' | 'email' | 'progress' | 'trails' | 'lastModule' | 'status';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'em_dia' | 'regular' | 'atrasado';

export function TeamTable({ areaId }: TeamTableProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Buscar dados da equipe
  useEffect(() => {
    async function fetchTeamMembers() {
      try {
        const response = await fetch(
          `/api/gestor/team?${areaId ? `areaId=${areaId}` : ''}`
        );
        if (response.ok) {
          const data = await response.json();
          setTeamMembers(data);
        }
      } catch (error) {
        console.error('Erro ao buscar membros da equipe:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTeamMembers();
  }, [areaId]);

  // Filtrar e ordenar
  const filteredAndSorted = useMemo(() => {
    let filtered = teamMembers;

    // Aplicar filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((member) => member.status === statusFilter);
    }

    // Aplicar ordenação
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'progress':
          aValue = a.overallProgress;
          bValue = b.overallProgress;
          break;
        case 'trails':
          aValue = a.trailsCompleted;
          bValue = b.trailsCompleted;
          break;
        case 'lastModule':
          aValue = a.lastModuleCompletedAt
            ? new Date(a.lastModuleCompletedAt).getTime()
            : 0;
          bValue = b.lastModuleCompletedAt
            ? new Date(b.lastModuleCompletedAt).getTime()
            : 0;
          break;
        case 'status':
          const statusOrder = { em_dia: 0, regular: 1, atrasado: 2 };
          aValue = statusOrder[a.status];
          bValue = statusOrder[b.status];
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [teamMembers, sortField, sortDirection, statusFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: TeamMember['status']) => {
    switch (status) {
      case 'em_dia':
        return <Badge color="green">Em dia</Badge>;
      case 'regular':
        return <Badge color="yellow">Regular</Badge>;
      case 'atrasado':
        return <Badge color="red">Atrasado</Badge>;
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-[#6B7194] dark:text-[#8888A0]" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-[#6B2FA0]" />
    ) : (
      <ArrowDown className="w-4 h-4 text-[#6B2FA0]" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#6B7194] dark:text-[#8888A0]">Carregando equipe...</p>
      </div>
    );
  }

  if (filteredAndSorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#6B7194] dark:text-[#8888A0]">
          {statusFilter !== 'all'
            ? 'Nenhum colaborador encontrado com este status.'
            : 'Nenhum colaborador encontrado na área.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtro de Status */}
      <div className="flex justify-end">
        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'em_dia', label: 'Em dia' },
              { value: 'regular', label: 'Regular' },
              { value: 'atrasado', label: 'Atrasado' },
            ]}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E2E5F1] dark:border-[#2D2D4A]">
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 text-sm font-medium text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED] transition-colors"
                >
                  Nome
                  {getSortIcon('name')}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('email')}
                  className="flex items-center gap-2 text-sm font-medium text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED] transition-colors"
                >
                  Email
                  {getSortIcon('email')}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('progress')}
                  className="flex items-center gap-2 text-sm font-medium text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED] transition-colors"
                >
                  Progresso Geral
                  {getSortIcon('progress')}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('trails')}
                  className="flex items-center gap-2 text-sm font-medium text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED] transition-colors"
                >
                  Trilhas Concluídas
                  {getSortIcon('trails')}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('lastModule')}
                  className="flex items-center gap-2 text-sm font-medium text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED] transition-colors"
                >
                  Último Módulo
                  {getSortIcon('lastModule')}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 text-sm font-medium text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED] transition-colors"
                >
                  Status
                  {getSortIcon('status')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((member) => (
              <tr
                key={member.id}
                className="border-b border-[#E2E5F1] dark:border-[#2D2D4A] hover:bg-[#F8F9FC] dark:hover:bg-[#2D2D4A]/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {member.avatar_url ? (
                      <Image
                        src={member.avatar_url}
                        alt={member.name}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#E2E5F1] dark:bg-[#2D2D4A] flex items-center justify-center text-sm font-medium text-[#1A1D2E] dark:text-[#E8E8ED]">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-[#1A1D2E] dark:text-[#E8E8ED] font-medium">
                      {member.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-[#6B7194] dark:text-[#8888A0] text-sm">
                  {member.email}
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-1.5">
                    <ProgressBar
                      value={member.overallProgress}
                      size="sm"
                      showLabel={false}
                    />
                    <span className="text-xs text-[#6B7194] dark:text-[#8888A0]">
                      {member.overallProgress}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-[#1A1D2E] dark:text-[#E8E8ED] text-sm">
                  {member.trailsCompleted}/{member.totalTrails}
                </td>
                <td className="py-3 px-4 text-[#6B7194] dark:text-[#8888A0] text-sm">
                  {member.lastModuleCompletedAt
                    ? formatDate(member.lastModuleCompletedAt)
                    : 'Nunca'}
                </td>
                <td className="py-3 px-4">{getStatusBadge(member.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
