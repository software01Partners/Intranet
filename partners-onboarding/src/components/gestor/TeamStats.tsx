import { Card, CardContent } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Users, Award, AlertTriangle } from 'lucide-react';
import { getTeamStats } from '@/app/(dashboard)/gestor/page';

interface TeamStatsProps {
  areaId: string | null;
}

export async function TeamStats({ areaId }: TeamStatsProps) {
  const stats = await getTeamStats(areaId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8888A0] mb-1">
                Colaboradores na Área
              </p>
              <p className="text-2xl font-semibold text-[#E8E8ED]">
                {stats.totalMembers}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8888A0] mb-1">Progresso Médio</p>
              <div className="mt-2">
                <ProgressRing value={stats.averageProgress} size={60} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8888A0] mb-1">
                Trilhas Concluídas
              </p>
              <p className="text-2xl font-semibold text-[#E8E8ED]">
                {stats.trailsCompleted}
              </p>
            </div>
            <Award className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8888A0] mb-1">Atrasados</p>
              <p className="text-2xl font-semibold text-[#E8E8ED]">
                {stats.delayedMembers}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
