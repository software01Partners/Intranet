'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ContentAnalyticsData } from '@/lib/metrics';
import { Clock } from 'lucide-react';

interface ContentTabProps {
  data: ContentAnalyticsData;
}

const tooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E0DCD6',
  borderRadius: '12px',
  color: '#2D2A26',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

const moduleTypeLabels: Record<string, string> = {
  video: 'Vídeo',
  document: 'Documento',
  quiz: 'Quiz',
};

const moduleTypeColors: Record<string, string> = {
  video: '#1B4D3E',
  document: '#3B82F6',
  quiz: '#D4A053',
};

function formatSeconds(seconds: number): string {
  if (seconds === 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

export function ContentTab({ data }: ContentTabProps) {
  const barData = data.moduleTypeBreakdown.map((item) => ({
    name: moduleTypeLabels[item.type] || item.type,
    quantidade: item.count,
    conclusao: item.avgCompletion,
    color: moduleTypeColors[item.type] || '#1B4D3E',
  }));

  const timeData = data.timeByType.map((item) => ({
    name: item.label,
    minutos: Math.round(item.totalSeconds / 60),
    mediaMin: Math.round(item.avgSeconds / 60),
    color: moduleTypeColors[item.type] || '#1B4D3E',
  }));

  const hasTimeData = data.timeByType.some((t) => t.totalSeconds > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quantidade por tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Módulos por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0DCD6" />
                <XAxis dataKey="name" stroke="#7A7468" tick={{ fill: '#7A7468' }} />
                <YAxis stroke="#7A7468" tick={{ fill: '#7A7468' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="quantidade" name="Quantidade" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Taxa de conclusão por tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Conclusão por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0DCD6" />
                <XAxis dataKey="name" stroke="#7A7468" tick={{ fill: '#7A7468' }} />
                <YAxis
                  stroke="#7A7468"
                  tick={{ fill: '#7A7468' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'transparent' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${value}%`, 'Conclusão']}
                />
                <Bar dataKey="conclusao" name="Conclusão %" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tempo Gasto por Tipo de Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#1B4D3E]" />
              Tempo Total por Tipo de Conteúdo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasTimeData ? (
              <p className="text-center text-[#7A7468] dark:text-[#9A9590] py-8">
                Nenhum dado de tempo registrado ainda.
                <br />
                <span className="text-xs">O tempo será rastreado conforme os usuários assistem vídeos, leem documentos e fazem quizzes.</span>
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0DCD6" />
                  <XAxis dataKey="name" stroke="#7A7468" tick={{ fill: '#7A7468' }} />
                  <YAxis stroke="#7A7468" tick={{ fill: '#7A7468' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'transparent' }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [`${value} min`, 'Tempo total']}
                  />
                  <Bar dataKey="minutos" name="Minutos" radius={[4, 4, 0, 0]}>
                    {timeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tempo médio por tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#3B82F6]" />
              Tempo Médio por Módulo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasTimeData ? (
              <p className="text-center text-[#7A7468] dark:text-[#9A9590] py-8">
                Nenhum dado de tempo registrado ainda.
              </p>
            ) : (
              <div className="space-y-4 py-4">
                {data.timeByType.map((item) => (
                  <div key={item.type} className="flex items-center gap-4">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: moduleTypeColors[item.type] }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0]">
                        {item.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#2D2A26] dark:text-[#E8E5E0]">
                        {formatSeconds(item.avgSeconds)}
                      </p>
                      <p className="text-xs text-[#7A7468] dark:text-[#9A9590]">
                        Total: {formatSeconds(item.totalSeconds)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tempo por Usuário */}
      {data.timeByUser.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tempo na Plataforma por Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E0DCD6] dark:border-[#3D3D3D]">
                    <th className="text-left py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">
                      Usuário
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">
                      Tempo Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.timeByUser.map((user, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#E0DCD6]/50 dark:border-[#3D3D3D]/50 hover:bg-[#F5F3EF] dark:hover:bg-[#3D3D3D]/30"
                    >
                      <td className="py-3 px-2 text-[#2D2A26] dark:text-[#E8E5E0]">
                        {user.userName}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-[#2D2A26] dark:text-[#E8E5E0]">
                        {formatSeconds(user.totalSeconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desempenho em Quizzes */}
      <Card>
        <CardHeader>
          <CardTitle>Desempenho em Quizzes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.quizPerformance.length === 0 ? (
            <p className="text-center text-[#7A7468] dark:text-[#9A9590] py-8">
              Nenhum quiz respondido ainda
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E0DCD6] dark:border-[#3D3D3D]">
                    <th className="text-left py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">
                      Trilha
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">
                      Módulo
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">
                      Nota Média
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-[#7A7468] dark:text-[#9A9590]">
                      Respostas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.quizPerformance.map((quiz, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#E0DCD6]/50 dark:border-[#3D3D3D]/50 hover:bg-[#F5F3EF] dark:hover:bg-[#3D3D3D]/30"
                    >
                      <td className="py-3 px-2 text-[#2D2A26] dark:text-[#E8E5E0]">
                        {quiz.trailName}
                      </td>
                      <td className="py-3 px-2 text-[#2D2A26] dark:text-[#E8E5E0]">
                        {quiz.moduleName}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`font-bold ${
                            quiz.averageScore >= 70
                              ? 'text-[#10B981]'
                              : quiz.averageScore >= 50
                              ? 'text-[#F59E0B]'
                              : 'text-[#EF4444]'
                          }`}
                        >
                          {quiz.averageScore}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-[#2D2A26] dark:text-[#E8E5E0]">
                        {quiz.attemptCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
