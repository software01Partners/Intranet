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
  border: '1px solid #E2E5F1',
  borderRadius: '12px',
  color: '#1A1D2E',
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
              <p className="text-center text-[#6B7194] dark:text-[#8888A0] py-12">
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
                      <span className="text-[#1A1D2E] dark:text-[#E8E8ED]">{value}</span>
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
                <p className="text-center text-[#6B7194] dark:text-[#8888A0] py-12">
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
                        <Cell key={`cell-${index}`} fill={entry.areaColor || '#6B2FA0'} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E5F1" />
              <XAxis
                dataKey="label"
                stroke="#6B7194"
                tick={{ fill: '#6B7194', fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis stroke="#6B7194" tick={{ fill: '#6B7194' }} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'transparent' }}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-[#1A1D2E] dark:text-[#E8E8ED]">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="completions"
                name="Módulos Concluídos"
                stroke="#6B2FA0"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="certificates"
                name="Certificados"
                stroke="#F5A623"
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
