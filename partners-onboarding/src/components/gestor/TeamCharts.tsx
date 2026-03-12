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
import {
  getTrailProgressData,
  getTeamMembers,
} from '@/app/(dashboard)/gestor/page';

interface TeamChartsProps {
  areaId: string | null;
}

const COLORS = {
  accent: '#E8580C',
  green: '#10B981',
  blue: '#3B82F6',
  red: '#EF4444',
  yellow: '#F59E0B',
};

export async function TeamCharts({ areaId }: TeamChartsProps) {
  const trailData = await getTrailProgressData(areaId);
  const teamMembers = await getTeamMembers(areaId);

  // Preparar dados para o BarChart
  const barData = trailData.map((trail) => ({
    name: trail.trailName.length > 20 
      ? trail.trailName.substring(0, 20) + '...' 
      : trail.trailName,
    fullName: trail.trailName,
    progress: trail.averageProgress,
    type: trail.trailType,
  }));

  // Preparar dados para o PieChart (distribuição de status)
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
              <CartesianGrid strokeDasharray="3 3" stroke="#262630" />
              <XAxis
                type="number"
                domain={[0, 100]}
                stroke="#8888A0"
                tick={{ fill: '#8888A0' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#8888A0"
                tick={{ fill: '#8888A0' }}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#13131A',
                  border: '1px solid #262630',
                  borderRadius: '8px',
                  color: '#E8E8ED',
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value}%`,
                  props.payload.fullName,
                ]}
              />
              <Bar
                dataKey="progress"
                radius={[0, 4, 4, 0]}
              >
                {barData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.type === 'optativa'
                        ? COLORS.green
                        : COLORS.accent
                    }
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
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
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
                  backgroundColor: '#13131A',
                  border: '1px solid #262630',
                  borderRadius: '8px',
                  color: '#E8E8ED',
                }}
              />
              <Legend
                wrapperStyle={{ color: '#E8E8ED' }}
                formatter={(value) => (
                  <span style={{ color: '#E8E8ED' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
