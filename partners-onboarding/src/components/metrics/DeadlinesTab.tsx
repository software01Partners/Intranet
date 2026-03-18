'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDeadline, getDeadlineStatus, calculateProgress } from '@/lib/utils';
import type { DeadlineItem } from '@/lib/metrics';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface DeadlinesTabProps {
  deadlines: DeadlineItem[];
}

const borderColors: Record<string, string> = {
  overdue: 'border-l-[#EF4444]',
  urgent: 'border-l-[#F59E0B]',
  warning: 'border-l-[#F59E0B]',
  ok: 'border-l-[#10B981]',
  no_deadline: 'border-l-[#6B7194]',
};

const bgColors: Record<string, string> = {
  overdue: 'bg-[#EF4444]/5',
  urgent: 'bg-[#F59E0B]/5',
  warning: 'bg-[#F59E0B]/5',
  ok: 'bg-[#10B981]/5',
  no_deadline: '',
};

const statusIcons: Record<string, React.ReactNode> = {
  overdue: <AlertTriangle className="w-5 h-5 text-[#EF4444]" />,
  urgent: <Clock className="w-5 h-5 text-[#F59E0B]" />,
  warning: <Clock className="w-5 h-5 text-[#F59E0B]" />,
  ok: <CheckCircle className="w-5 h-5 text-[#10B981]" />,
};

export function DeadlinesTab({ deadlines }: DeadlinesTabProps) {
  if (deadlines.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Nenhum prazo definido"
        description="Nenhuma trilha possui prazo definido no momento."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {deadlines.map((item) => {
        const status = getDeadlineStatus(item.deadline);
        const progress = calculateProgress(item.completedUsers, item.totalUsers);

        return (
          <Card
            key={item.trailId}
            className={`border-l-4 ${borderColors[status]} ${bgColors[status]}`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#1A1D2E] dark:text-[#E8E8ED] truncate">
                    {item.trailName}
                  </h3>
                  <p className="text-sm text-[#6B7194] dark:text-[#8888A0] mt-0.5">
                    {formatDeadline(item.deadline)}
                  </p>
                </div>
                {statusIcons[status]}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-[#6B7194] dark:text-[#8888A0] mb-1">
                    <span>{item.completedUsers}/{item.totalUsers} concluíram</span>
                    <span>{progress}%</span>
                  </div>
                  <ProgressBar value={progress} />
                </div>

                {item.overdueUsers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#EF4444] mb-1">
                      Atrasados ({item.overdueUsers.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {item.overdueUsers.slice(0, 5).map((name) => (
                        <Badge key={name} color="red">
                          {name}
                        </Badge>
                      ))}
                      {item.overdueUsers.length > 5 && (
                        <Badge color="red">
                          +{item.overdueUsers.length - 5} mais
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
