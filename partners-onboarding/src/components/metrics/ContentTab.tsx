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
  border: '1px solid #E2E5F1',
  borderRadius: '12px',
  color: '#1A1D2E',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

const moduleTypeLabels: Record<string, string> = {
  video: 'Vídeo',
  document: 'Documento',
  quiz: 'Quiz',
};

const moduleTypeColors: Record<string, string> = {
  video: '#6B2FA0',
  document: '#3B82F6',
  quiz: '#F5A623',
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
    color: moduleTypeColors[item.type] || '#6B2FA0',
  }));

  const timeData = data.timeByType.map((item) => ({
    name: item.label,
    minutos: Math.round(item.totalSeconds / 60),
    mediaMin: Math.round(item.avgSeconds / 60),
    color: moduleTypeColors[item.type] || '#6B2FA0',
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
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E5F1" />
                <XAxis dataKey="name" stroke="#6B7194" tick={{ fill: '#6B7194' }} />
                <YAxis stroke="#6B7194" tick={{ fill: '#6B7194' }} allowDecimals={false} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E5F1" />
                <XAxis dataKey="name" stroke="#6B7194" tick={{ fill: '#6B7194' }} />
                <YAxis
                  stroke="#6B7194"
                  tick={{ fill: '#6B7194' }}
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
              <Clock className="w-5 h-5 text-[#6B2FA0]" />
              Tempo Total por Tipo de Conteúdo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasTimeData ? (
              <p className="text-center text-[#6B7194] dark:text-[#8888A0] py-8">
                Nenhum dado de tempo registrado ainda.
                <br />
                <span className="text-xs">O tempo será rastreado conforme os usuários assistem vídeos, leem documentos e fazem quizzes.</span>
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E5F1" />
                  <XAxis dataKey="name" stroke="#6B7194" tick={{ fill: '#6B7194' }} />
                  <YAxis stroke="#6B7194" tick={{ fill: '#6B7194' }} allowDecimals={false} />
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
              <p className="text-center text-[#6B7194] dark:text-[#8888A0] py-8">
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
                      <p className="text-sm font-medium text-[#1A1D2E] dark:text-[#E8E8ED]">
                        {item.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#1A1D2E] dark:text-[#E8E8ED]">
                        {formatSeconds(item.avgSeconds)}
                      </p>
                      <p className="text-xs text-[#6B7194] dark:text-[#8888A0]">
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
                  <tr className="border-b border-[#E2E5F1] dark:border-[#2D2D4A]">
                    <th className="text-left py-3 px-2 font-medium text-[#6B7194] dark:text-[#8888A0]">
                      Usuário
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-[#6B7194] dark:text-[#8888A0]">
                      Tempo Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.timeByUser.map((user, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#E2E5F1]/50 dark:border-[#2D2D4A]/50 hover:bg-[#F8F9FC] dark:hover:bg-[#2D2D4A]/30"
                    >
                      <td className="py-3 px-2 text-[#1A1D2E] dark:text-[#E8E8ED]">
                        {user.userName}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-[#1A1D2E] dark:text-[#E8E8ED]">
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
            <p className="text-center text-[#6B7194] dark:text-[#8888A0] py-8">
              Nenhum quiz respondido ainda
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E5F1] dark:border-[#2D2D4A]">
                    <th className="text-left py-3 px-2 font-medium text-[#6B7194] dark:text-[#8888A0]">
                      Trilha
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-[#6B7194] dark:text-[#8888A0]">
                      Módulo
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-[#6B7194] dark:text-[#8888A0]">
                      Nota Média
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-[#6B7194] dark:text-[#8888A0]">
                      Respostas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.quizPerformance.map((quiz, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#E2E5F1]/50 dark:border-[#2D2D4A]/50 hover:bg-[#F8F9FC] dark:hover:bg-[#2D2D4A]/30"
                    >
                      <td className="py-3 px-2 text-[#1A1D2E] dark:text-[#E8E8ED]">
                        {quiz.trailName}
                      </td>
                      <td className="py-3 px-2 text-[#1A1D2E] dark:text-[#E8E8ED]">
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
                      <td className="py-3 px-2 text-center text-[#1A1D2E] dark:text-[#E8E8ED]">
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
