'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrailProgressData, TeamMember } from '@/app/(dashboard)/gestor/page';

interface TeamChartsClientProps {
  trailData: TrailProgressData[];
  teamMembers: TeamMember[];
}

const COLORS = {
  primary: '#6B2FA0',
  green: '#10B981',
  blue: '#3B82F6',
  red: '#EF4444',
  yellow: '#F59E0B',
};

export function TeamChartsClient({ trailData, teamMembers }: TeamChartsClientProps) {
  const barData = trailData.map((trail) => ({
    name: trail.trailName.length > 20
      ? trail.trailName.substring(0, 20) + '...'
      : trail.trailName,
    fullName: trail.trailName,
    progress: trail.averageProgress,
    type: trail.trailType,
  }));

  const statusCounts = {
    em_dia: teamMembers.filter((m) => m.status === 'em_dia').length,
    regular: teamMembers.filter((m) => m.status === 'regular').length,
    atrasado: teamMembers.filter((m) => m.status === 'atrasado').length,
  };

  const pieData = [
    { name: 'Em dia', value: statusCounts.em_dia, color: COLORS.green },
    { name: 'Regular', value: statusCounts.regular, color: COLORS.yellow },
    { name: 'Atrasado', value: statusCounts.atrasado, color: COLORS.red },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* BarChart - Progresso médio por trilha */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso Médio por Trilha</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E5F1" />
              <XAxis
                type="number"
                domain={[0, 100]}
                stroke="#6B7194"
                tick={{ fill: '#6B7194' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#6B7194"
                tick={{ fill: '#6B7194' }}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E5F1',
                  borderRadius: '12px',
                  color: '#1A1D2E',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                formatter={(value: unknown, _name: unknown, props: { payload?: { fullName?: string } }) => [
                  `${value}%`,
                  props.payload?.fullName ?? '',
                ]}
              />
              <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
                {barData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.type === 'optativa_global' || entry.type === 'optativa_area' ? COLORS.green : COLORS.primary}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* PieChart - Distribuição de status */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                outerRadius={120}
                fill="#888888"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E5F1',
                  borderRadius: '12px',
                  color: '#1A1D2E',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <Legend
                wrapperStyle={{ color: 'currentColor' }}
                formatter={(value) => (
                  <span className="text-[#1A1D2E] dark:text-[#E8E8ED]">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
