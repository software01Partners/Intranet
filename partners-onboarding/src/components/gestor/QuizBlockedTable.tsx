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
              <tr className="border-b border-[#E2E5F1] dark:border-[#2D2D4A]">
                <th className="text-left py-3 px-2 text-[#6B7194] dark:text-[#8888A0] font-medium">
                  Usuário
                </th>
                <th className="text-left py-3 px-2 text-[#6B7194] dark:text-[#8888A0] font-medium">
                  Quiz
                </th>
                <th className="text-left py-3 px-2 text-[#6B7194] dark:text-[#8888A0] font-medium">
                  Trilha
                </th>
                <th className="text-center py-3 px-2 text-[#6B7194] dark:text-[#8888A0] font-medium">
                  Tentativas
                </th>
                <th className="text-center py-3 px-2 text-[#6B7194] dark:text-[#8888A0] font-medium">
                  Último Score
                </th>
                <th className="text-left py-3 px-2 text-[#6B7194] dark:text-[#8888A0] font-medium">
                  Bloqueado até
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={`${item.userId}-${item.moduleId}`}
                  className="border-b border-[#E2E5F1]/50 dark:border-[#2D2D4A]/50 last:border-0"
                >
                  <td className="py-3 px-2 text-[#1A1D2E] dark:text-[#E8E8ED]">
                    {item.userName}
                  </td>
                  <td className="py-3 px-2 text-[#1A1D2E] dark:text-[#E8E8ED]">
                    {item.moduleName}
                  </td>
                  <td className="py-3 px-2 text-[#6B7194] dark:text-[#8888A0]">
                    {item.trailName}
                  </td>
                  <td className="py-3 px-2 text-center text-[#1A1D2E] dark:text-[#E8E8ED]">
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
