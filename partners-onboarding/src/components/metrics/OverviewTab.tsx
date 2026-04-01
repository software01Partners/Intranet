'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { StatusDistributionItem, AreaComparisonItem, TimelinePoint } from '@/lib/metrics';

interface OverviewTabProps {
  statusDistribution: StatusDistributionItem[];
  areaComparison: AreaComparisonItem[];
  timeline: TimelinePoint[];
  isAdmin: boolean;
}

const tooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E0DCD6',
  borderRadius: '12px',
  color: '#2D2A26',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

export function OverviewTab({
  statusDistribution,
  areaComparison,
  timeline,
  isAdmin,
}: OverviewTabProps) {
  // Formatar datas para DD/MM no eixo X do timeline
  const timelineFormatted = timeline.map((t) => {
    const [, month, day] = t.date.split('-');
    return { ...t, label: `${day}/${month}` };
  });

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* PieChart - Distribuição de Status */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.every((s) => s.value === 0) ? (
              <p className="text-center text-[#7A7468] dark:text-[#9A9590] py-12">
                Nenhum dado disponível
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      percent && percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                    }
                    outerRadius={100}
                    fill="#888888"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'transparent' }} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-[#2D2A26] dark:text-[#E8E5E0]">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* BarChart - Comparação entre Áreas (admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Progresso por Área</CardTitle>
            </CardHeader>
            <CardContent>
              {areaComparison.length === 0 ? (
                <p className="text-center text-[#7A7468] dark:text-[#9A9590] py-12">
                  Nenhuma área cadastrada
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={areaComparison.map((a) => ({
                      name:
                        a.areaName.length > 15
                          ? a.areaName.substring(0, 15) + '...'
                          : a.areaName,
                      fullName: a.areaName,
                      progress: a.averageProgress,
                      members: a.memberCount,
                      color: a.areaColor,
                    }))}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0DCD6" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      stroke="#7A7468"
                      tick={{ fill: '#7A7468' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#7A7468"
                      tick={{ fill: '#7A7468' }}
                      width={70}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'transparent' }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any, _name: any, props: any) => [
                        `${value}% (${props.payload.members} membros)`,
                        props.payload.fullName,
                      ]}
                    />
                    <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
                      {areaComparison.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.areaColor || '#1B4D3E'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* LineChart - Timeline de Conclusões */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade nos Últimos 30 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={timelineFormatted}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E0DCD6" />
              <XAxis
                dataKey="label"
                stroke="#7A7468"
                tick={{ fill: '#7A7468', fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis stroke="#7A7468" tick={{ fill: '#7A7468' }} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'transparent' }}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-[#2D2A26] dark:text-[#E8E5E0]">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="completions"
                name="Módulos Concluídos"
                stroke="#1B4D3E"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="certificates"
                name="Certificados"
                stroke="#D4A053"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
