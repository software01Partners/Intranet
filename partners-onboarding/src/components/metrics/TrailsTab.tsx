'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Select } from '@/components/ui/Select';
import { formatDeadline, getDeadlineStatus } from '@/lib/utils';
import type { TrailAnalyticsItem } from '@/lib/metrics';
import { ArrowUpDown } from 'lucide-react';

interface TrailsTabProps {
  trails: TrailAnalyticsItem[];
}

type SortKey = 'trailName' | 'averageProgress' | 'completedCount' | 'overdueCount';
type SortDir = 'asc' | 'desc';

const trailTypeLabels: Record<string, string> = {
  obrigatoria_global: 'Obrigatória Global',
  obrigatoria_area: 'Obrigatória Área',
  optativa_global: 'Optativa Global',
  optativa_area: 'Optativa Área',
};

export function TrailsTab({ trails }: TrailsTabProps) {
  const [sortKey, setSortKey] = useState<SortKey>('averageProgress');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterType, setFilterType] = useState<string>('all');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let result = [...trails];
    if (filterType !== 'all') {
      result = result.filter((t) => t.trailType === filterType);
    }
    result.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [trails, filterType, sortKey, sortDir]);

  const deadlineColor: Record<string, string> = {
    overdue: 'text-[#EF4444]',
    urgent: 'text-[#F59E0B]',
    warning: 'text-[#F59E0B]',
    ok: 'text-[#10B981]',
    no_deadline: 'text-[#7A7468] dark:text-[#9A9590]',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Análise de Trilhas</CardTitle>
        <div className="w-48">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            options={[
              { value: 'all', label: 'Todos os tipos' },
              { value: 'obrigatoria_global', label: 'Obrigatória Global' },
              { value: 'obrigatoria_area', label: 'Obrigatória Área' },
              { value: 'optativa_global', label: 'Optativa Global' },
              { value: 'optativa_area', label: 'Optativa Área' },
            ]}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E0DCD6] dark:border-[#3D3D3D]">
                <th className="text-left py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">
                  <button onClick={() => toggleSort('trailName')} className="flex items-center gap-1 hover:text-[#2D2A26] dark:hover:text-[#E8E5E0]">
                    Trilha <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">Tipo</th>
                <th className="text-center py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">Inscritos</th>
                <th className="text-center py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">
                  <button onClick={() => toggleSort('completedCount')} className="flex items-center gap-1 hover:text-[#2D2A26] dark:hover:text-[#E8E5E0] mx-auto">
                    Concluíram <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-center py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590] min-w-[140px]">
                  <button onClick={() => toggleSort('averageProgress')} className="flex items-center gap-1 hover:text-[#2D2A26] dark:hover:text-[#E8E5E0] mx-auto">
                    Progresso <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-center py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">Quiz</th>
                <th className="text-left py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">Prazo</th>
                <th className="text-center py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">
                  <button onClick={() => toggleSort('overdueCount')} className="flex items-center gap-1 hover:text-[#2D2A26] dark:hover:text-[#E8E5E0] mx-auto">
                    Atrasados <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[#7A7468] dark:text-[#9A9590]">
                    Nenhuma trilha encontrada
                  </td>
                </tr>
              ) : (
                filtered.map((trail) => {
                  const dlStatus = getDeadlineStatus(trail.deadline);
                  return (
                    <tr
                      key={trail.trailId}
                      className="border-b border-[#E0DCD6]/50 dark:border-[#3D3D3D]/50 hover:bg-[#F5F3EF] dark:hover:bg-[#3D3D3D]/30"
                    >
                      <td className="py-3 px-2 font-medium text-[#2D2A26] dark:text-[#E8E5E0]">
                        {trail.trailName}
                      </td>
                      <td className="py-3 px-2">
                        <Badge color={trail.trailType}>
                          {trailTypeLabels[trail.trailType]}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center text-[#2D2A26] dark:text-[#E8E5E0]">
                        {trail.totalEnrolled}
                      </td>
                      <td className="py-3 px-2 text-center text-[#2D2A26] dark:text-[#E8E5E0]">
                        {trail.completedCount}/{trail.totalEnrolled}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={trail.averageProgress} />
                          <span className="text-xs text-[#7A7468] dark:text-[#9A9590] w-10 text-right">
                            {trail.averageProgress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center text-[#2D2A26] dark:text-[#E8E5E0]">
                        {trail.averageQuizScore != null ? `${trail.averageQuizScore}%` : '—'}
                      </td>
                      <td className={`py-3 px-2 text-xs ${deadlineColor[dlStatus]}`}>
                        {formatDeadline(trail.deadline)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {trail.overdueCount > 0 ? (
                          <span className="text-[#EF4444] font-medium">{trail.overdueCount}</span>
                        ) : (
                          <span className="text-[#10B981]">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
