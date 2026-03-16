import { getTrailProgressData, getTeamMembers } from '@/app/(dashboard)/gestor/page';
import { TeamChartsClient } from './TeamChartsClient';

interface TeamChartsProps {
  areaId: string | null;
}

export async function TeamCharts({ areaId }: TeamChartsProps) {
  const [trailData, teamMembers] = await Promise.all([
    getTrailProgressData(areaId),
    getTeamMembers(areaId),
  ]);

  return <TeamChartsClient trailData={trailData} teamMembers={teamMembers} />;
}
