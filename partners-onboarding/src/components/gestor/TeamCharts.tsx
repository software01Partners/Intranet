import { getTrailProgressData, getTeamMembers } from '@/app/(dashboard)/gestor/page';
import { TeamChartsClient } from './TeamChartsClient';

interface TeamChartsProps {
  areaIds: string[];
}

export async function TeamCharts({ areaIds }: TeamChartsProps) {
  const [trailData, teamMembers] = await Promise.all([
    getTrailProgressData(areaIds),
    getTeamMembers(areaIds),
  ]);

  return <TeamChartsClient trailData={trailData} teamMembers={teamMembers} />;
}
