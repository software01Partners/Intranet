'use client';

import { Clock, Layers, CheckCircle2, Play, ArrowRight, CalendarClock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { formatDuration, formatDeadline, getDeadlineStatus } from '@/lib/utils';
import { Trail } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface TrailCardProps {
  trail: Trail & {
    totalModules: number;
    progress: number;
    areaName?: string | null;
  };
}

export function TrailCard({ trail }: TrailCardProps) {
  const router = useRouter();

  const getBadgeConfig = () => {
    switch (trail.type) {
      case 'obrigatoria_global':
        return {
          label: 'Obrigatória Global',
          color: 'obrigatoria_global' as const,
        };
      case 'obrigatoria_area':
        return {
          label: trail.areaName
            ? `Obrigatória - ${trail.areaName}`
            : 'Obrigatória da Área',
          color: 'obrigatoria_area' as const,
        };
      case 'optativa_global':
        return {
          label: 'Optativa Global',
          color: 'optativa_global' as const,
        };
      case 'optativa_area':
        return {
          label: trail.areaName
            ? `Optativa - ${trail.areaName}`
            : 'Optativa da Área',
          color: 'optativa_area' as const,
        };
      default:
        return {
          label: trail.type,
          color: 'gray' as const,
        };
    }
  };

  const badgeConfig = getBadgeConfig();

  const getButtonText = () => {
    if (trail.progress === 100) {
      return 'Concluída ✓';
    }
    if (trail.progress > 0) {
      return 'Continuar';
    }
    return 'Iniciar';
  };

  const getButtonIcon = () => {
    if (trail.progress === 100) {
      return CheckCircle2;
    }
    if (trail.progress > 0) {
      return Play;
    }
    return ArrowRight;
  };

  const handleCardClick = () => {
    router.push(`/trilhas/${trail.id}`);
  };

  return (
    <Card
      hover
      className="cursor-pointer flex flex-col h-full"
      onClick={handleCardClick}
    >
      <div className="flex-1 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold text-[#2D2A26] dark:text-[#E8E5E0] flex-1">
            {trail.name}
          </h3>
          <Badge variant="soft" color={badgeConfig.color}>
            {badgeConfig.label}
          </Badge>
        </div>

        {trail.description && (
          <p className="text-sm text-[#7A7468] dark:text-[#9A9590] line-clamp-2">
            {trail.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-[#7A7468] dark:text-[#9A9590]">
          {trail.duration && trail.duration > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(trail.duration)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            <span>{trail.totalModules} módulos</span>
          </div>
        </div>

        {trail.deadline && trail.progress < 100 && (() => {
          const status = getDeadlineStatus(trail.deadline);
          const deadlineColorClass =
            status === 'overdue' ? 'text-red-500' :
            status === 'urgent' ? 'text-orange-500' :
            status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
            'text-[#7A7468] dark:text-[#9A9590]';
          return (
            <div className={`flex items-center gap-1.5 text-sm ${deadlineColorClass}`}>
              <CalendarClock className="w-4 h-4" />
              <span className="font-medium">{formatDeadline(trail.deadline)}</span>
            </div>
          );
        })()}

        <div className="space-y-1.5">
          <ProgressBar value={trail.progress} size="sm" />
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#B0A99E] dark:text-[#9A9590]">Progresso</span>
            <span className="text-[#2D2A26] dark:text-[#E8E5E0] font-medium">
              {Math.round(trail.progress)}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#E0DCD6] dark:border-[#3D3D3D]">
        <Link href={`/trilhas/${trail.id}`} onClick={(e) => e.stopPropagation()}>
          <Button
            variant={trail.progress === 100 ? 'secondary' : 'primary'}
            size="sm"
            className="w-full"
            icon={getButtonIcon()}
            iconPosition="right"
          >
            {getButtonText()}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
