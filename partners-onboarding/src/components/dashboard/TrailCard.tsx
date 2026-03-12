'use client';

import { Clock, Layers, CheckCircle2, Play, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';
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
          color: 'accent' as const,
        };
      case 'obrigatoria_area':
        return {
          label: trail.areaName
            ? `Obrigatória - ${trail.areaName}`
            : 'Obrigatória da Área',
          color: 'purple' as const,
        };
      case 'optativa':
        return {
          label: 'Optativa',
          color: 'green' as const,
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
        {/* Header com badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-[#E8E8ED] flex-1">
            {trail.name}
          </h3>
          <Badge variant="soft" color={badgeConfig.color}>
            {badgeConfig.label}
          </Badge>
        </div>

        {/* Descrição */}
        {trail.description && (
          <p className="text-sm text-[#8888A0] line-clamp-2">
            {trail.description}
          </p>
        )}

        {/* Informações */}
        <div className="flex items-center gap-4 text-sm text-[#8888A0]">
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

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <ProgressBar value={trail.progress} size="sm" />
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#8888A0]">Progresso</span>
            <span className="text-[#E8E8ED] font-medium">
              {Math.round(trail.progress)}%
            </span>
          </div>
        </div>
      </div>

      {/* Botão de ação */}
      <div className="mt-4 pt-4 border-t border-[#262630]">
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
