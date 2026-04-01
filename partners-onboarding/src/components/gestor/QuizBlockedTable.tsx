'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Lock } from 'lucide-react';

export interface QuizBlockedItem {
  userId: string;
  userName: string;
  moduleId: string;
  moduleName: string;
  trailName: string;
  totalAttempts: number;
  lastScore: number;
  blockedUntil: string;
}

interface QuizBlockedTableProps {
  items: QuizBlockedItem[];
}

export function QuizBlockedTable({ items }: QuizBlockedTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-red-400" />
          Quizzes Bloqueados ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E0DCD6] dark:border-[#3D3D3D]">
                <th className="text-left py-3 px-2 text-[#7A7468] dark:text-[#9A9590] font-medium">
                  Usuário
                </th>
                <th className="text-left py-3 px-2 text-[#7A7468] dark:text-[#9A9590] font-medium">
                  Quiz
                </th>
                <th className="text-left py-3 px-2 text-[#7A7468] dark:text-[#9A9590] font-medium">
                  Trilha
                </th>
                <th className="text-center py-3 px-2 text-[#7A7468] dark:text-[#9A9590] font-medium">
                  Tentativas
                </th>
                <th className="text-center py-3 px-2 text-[#7A7468] dark:text-[#9A9590] font-medium">
                  Último Score
                </th>
                <th className="text-left py-3 px-2 text-[#7A7468] dark:text-[#9A9590] font-medium">
                  Bloqueado até
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={`${item.userId}-${item.moduleId}`}
                  className="border-b border-[#E0DCD6]/50 dark:border-[#3D3D3D]/50 last:border-0"
                >
                  <td className="py-3 px-2 text-[#2D2A26] dark:text-[#E8E5E0]">
                    {item.userName}
                  </td>
                  <td className="py-3 px-2 text-[#2D2A26] dark:text-[#E8E5E0]">
                    {item.moduleName}
                  </td>
                  <td className="py-3 px-2 text-[#7A7468] dark:text-[#9A9590]">
                    {item.trailName}
                  </td>
                  <td className="py-3 px-2 text-center text-[#2D2A26] dark:text-[#E8E5E0]">
                    {item.totalAttempts}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={item.lastScore >= 80 ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                      {item.lastScore}%
                    </span>
                  </td>
                  <td className="py-3 px-2 text-[#F59E0B]">
                    {new Date(item.blockedUntil).toLocaleDateString('pt-BR')}{' '}
                    {new Date(item.blockedUntil).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
