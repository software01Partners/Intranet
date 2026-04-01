'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Input } from '@/components/ui/Input';
import { formatRelativeTime } from '@/lib/utils';
import type { UserRankingItem } from '@/lib/metrics';
import { ArrowUpDown, Search, TrendingUp, TrendingDown } from 'lucide-react';

interface UsersTabProps {
  users: UserRankingItem[];
}

type SortKey = 'userName' | 'overallProgress' | 'trailsCompleted' | 'lastActivity';
type SortDir = 'asc' | 'desc';

const statusLabels: Record<string, string> = {
  em_dia: 'Em dia',
  regular: 'Regular',
  atrasado: 'Atrasado',
};

const statusColors: Record<string, 'green' | 'yellow' | 'red'> = {
  em_dia: 'green',
  regular: 'yellow',
  atrasado: 'red',
};

export function UsersTab({ users }: UsersTabProps) {
  const [sortKey, setSortKey] = useState<SortKey>('overallProgress');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let result = [...users];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) => u.userName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortKey === 'lastActivity') {
        const aDate = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const bDate = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return sortDir === 'asc' ? aDate - bDate : bDate - aDate;
      }
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [users, search, sortKey, sortDir]);

  // Top 5 mais ativos e menos ativos
  const sortedByProgress = [...users].sort((a, b) => b.overallProgress - a.overallProgress);
  const top5 = sortedByProgress.slice(0, 5);
  const bottom5 = sortedByProgress.slice(-5).reverse();

  return (
    <div className="space-y-6">
      {/* Top/Bottom Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#10B981]" />
              Top 5 — Mais Avançados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {top5.map((user, i) => (
                <div key={user.userId} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#10B981]/10 text-[#10B981] flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0] truncate">
                      {user.userName}
                    </p>
                    <p className="text-xs text-[#7A7468] dark:text-[#9A9590]">{user.areaName}</p>
                  </div>
                  <span className="text-sm font-bold text-[#10B981]">{user.overallProgress}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-[#EF4444]" />
              Top 5 — Precisam de Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bottom5.map((user, i) => (
                <div key={user.userId} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0] truncate">
                      {user.userName}
                    </p>
                    <p className="text-xs text-[#7A7468] dark:text-[#9A9590]">{user.areaName}</p>
                  </div>
                  <span className="text-sm font-bold text-[#EF4444]">{user.overallProgress}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ranking de Usuários</CardTitle>
          <div className="w-64">
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E0DCD6] dark:border-[#3D3D3D]">
                  <th className="text-left py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">
                    <button onClick={() => toggleSort('userName')} className="flex items-center gap-1 hover:text-[#2D2A26] dark:hover:text-[#E8E5E0]">
                      Nome <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">Área</th>
                  <th className="text-center py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590] min-w-[140px]">
                    <button onClick={() => toggleSort('overallProgress')} className="flex items-center gap-1 hover:text-[#2D2A26] dark:hover:text-[#E8E5E0] mx-auto">
                      Progresso <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-center py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">
                    <button onClick={() => toggleSort('trailsCompleted')} className="flex items-center gap-1 hover:text-[#2D2A26] dark:hover:text-[#E8E5E0] mx-auto">
                      Trilhas <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">
                    <button onClick={() => toggleSort('lastActivity')} className="flex items-center gap-1 hover:text-[#2D2A26] dark:hover:text-[#E8E5E0]">
                      Última Atividade <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-center py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#7A7468] dark:text-[#9A9590]">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <tr
                      key={user.userId}
                      className="border-b border-[#E0DCD6]/50 dark:border-[#3D3D3D]/50 hover:bg-[#F5F3EF] dark:hover:bg-[#3D3D3D]/30"
                    >
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-[#2D2A26] dark:text-[#E8E5E0]">
                            {user.userName}
                          </p>
                          <p className="text-xs text-[#7A7468] dark:text-[#9A9590]">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-[#2D2A26] dark:text-[#E8E5E0]">
                        {user.areaName}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={user.overallProgress} />
                          <span className="text-xs text-[#7A7468] dark:text-[#9A9590] w-10 text-right">
                            {user.overallProgress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center text-[#2D2A26] dark:text-[#E8E5E0]">
                        {user.trailsCompleted}/{user.totalTrails}
                      </td>
                      <td className="py-3 px-2 text-xs text-[#7A7468] dark:text-[#9A9590]">
                        {user.lastActivity ? formatRelativeTime(user.lastActivity) : 'Sem atividade'}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge color={statusColors[user.status]}>
                          {statusLabels[user.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
