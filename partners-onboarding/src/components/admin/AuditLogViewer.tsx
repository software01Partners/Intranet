'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AuditLog, AuditAction, AuditEntityType } from '@/lib/types';

const ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Criou',
  update: 'Editou',
  delete: 'Excluiu',
};

const ACTION_COLORS: Record<AuditAction, string> = {
  create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  trail: 'Trilha',
  module: 'Módulo',
  area: 'Área',
  user: 'Usuário',
  quiz_question: 'Questão de Quiz',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  gestor: 'Gestor',
};

function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

interface LogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

export function AuditLogViewer() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (entityFilter !== 'all') params.set('entityType', entityFilter);

      const response = await fetch(`/api/admin/audit-log?${params}`);
      if (!response.ok) throw new Error('Erro ao buscar logs');

      const result: LogsResponse = await response.json();
      setData(result);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [actionFilter, entityFilter]);

  const actionOptions = [
    { value: 'all', label: 'Todas as ações' },
    { value: 'create', label: 'Criação' },
    { value: 'update', label: 'Edição' },
    { value: 'delete', label: 'Exclusão' },
  ];

  const entityOptions = [
    { value: 'all', label: 'Todos os tipos' },
    { value: 'trail', label: 'Trilhas' },
    { value: 'module', label: 'Módulos' },
    { value: 'area', label: 'Áreas' },
    { value: 'user', label: 'Usuários' },
    { value: 'quiz_question', label: 'Questões de Quiz' },
  ];

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-48">
          <Select
            options={actionOptions}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={entityOptions}
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          />
        </div>
        {data && (
          <div className="flex items-center ml-auto text-sm text-[#7A7468] dark:text-[#9A9590]">
            {data.total} registro{data.total !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Lista de logs */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !data || data.logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-[#7A7468] dark:text-[#9A9590]">
            Nenhum log encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="py-3 px-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  {/* Ação + Entidade */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium shrink-0 ${ACTION_COLORS[log.action]}`}
                    >
                      {ACTION_LABELS[log.action]}
                    </span>
                    <Badge color={log.entity_type === 'trail' ? 'obrigatoria_global' : log.entity_type === 'module' ? 'optativa_global' : 'obrigatoria_area'}>
                      {ENTITY_LABELS[log.entity_type]}
                    </Badge>
                    {log.entity_name && (
                      <span className="text-sm text-[#2D2A26] dark:text-[#E8E5E0] font-medium truncate">
                        {log.entity_name}
                      </span>
                    )}
                  </div>

                  {/* Usuário + Role + Data */}
                  <div className="flex items-center gap-3 text-sm text-[#7A7468] dark:text-[#9A9590] shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[#2D2A26] dark:text-[#E8E5E0]">
                        {log.user_name}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          log.user_role === 'admin'
                            ? 'bg-[#1B4D3E]/10 text-[#1B4D3E] dark:bg-[#34D399]/15 dark:text-[#6EE7B7]'
                            : 'bg-[#D4A053]/10 text-[#D4A053] dark:bg-[#D4A053]/15 dark:text-[#F5C869]'
                        }`}
                      >
                        {ROLE_LABELS[log.user_role]}
                      </span>
                    </div>
                    <span className="text-xs whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                </div>

                {/* Detalhes extras */}
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="mt-2 text-xs text-[#7A7468] dark:text-[#9A9590] bg-[#F5F3EF] dark:bg-[#262626] rounded-lg px-3 py-2">
                    {Object.entries(log.details).map(([key, value]) => (
                      <span key={key} className="mr-4">
                        <span className="font-medium">{key}:</span>{' '}
                        {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Paginação */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-[#7A7468] dark:text-[#9A9590]">
            Página {page} de {data.totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
