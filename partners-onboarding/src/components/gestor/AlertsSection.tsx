import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertTriangle } from 'lucide-react';
import { getTeamMembers } from '@/app/(dashboard)/gestor/page';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';

interface AlertsSectionProps {
  areaId: string | null;
}

export async function AlertsSection({ areaId }: AlertsSectionProps) {
  const teamMembers = await getTeamMembers(areaId);
  const delayedMembers = teamMembers.filter((m) => m.status === 'atrasado');

  if (delayedMembers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertas de Atraso</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={AlertTriangle}
            title="Nenhum colaborador atrasado! 🎉"
            description="Todos os colaboradores estão com progresso adequado."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas de Atraso</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {delayedMembers.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-xl bg-[#F5F3EF] dark:bg-[#262626] border border-[#E0DCD6] dark:border-[#3D3D3D] hover:border-[#EF4444]/50 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                {member.avatar_url ? (
                  <Image
                    src={member.avatar_url}
                    alt={member.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#E0DCD6] dark:bg-[#3D3D3D] flex items-center justify-center text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0]">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-[#2D2A26] dark:text-[#E8E5E0] truncate">
                    {member.name}
                  </h4>
                  <p className="text-xs text-[#7A7468] dark:text-[#9A9590] truncate">
                    {member.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#7A7468] dark:text-[#9A9590]">Progresso</span>
                  <div className="flex items-center gap-2">
                    <ProgressRing
                      value={member.overallProgress}
                      size={40}
                      strokeWidth={4}
                    />
                    <span className="text-xs font-medium text-[#2D2A26] dark:text-[#E8E5E0]">
                      {member.overallProgress}%
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#7A7468] dark:text-[#9A9590]">
                  <div className="flex items-center justify-between mb-1">
                    <span>Último acesso:</span>
                    <span className="text-[#2D2A26] dark:text-[#E8E5E0]">
                      {member.lastModuleCompletedAt
                        ? formatDate(member.lastModuleCompletedAt)
                        : 'Nunca'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Trilhas concluídas:</span>
                    <span className="text-[#2D2A26] dark:text-[#E8E5E0]">
                      {member.trailsCompleted}/{member.totalTrails}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
