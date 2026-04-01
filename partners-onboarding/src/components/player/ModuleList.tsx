'use client';

import { Module, UserProgress, TrailType } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, Play, FileText, HelpCircle, Lock } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ModuleWithProgress extends Module {
  progress: UserProgress | null;
  isUnlocked: boolean;
}

interface ModuleListProps {
  modules: ModuleWithProgress[];
  currentModuleId: string;
  onModuleClick: (moduleId: string) => void;
}

export function ModuleList({
  modules,
  currentModuleId,
  onModuleClick,
}: ModuleListProps) {
  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'video':
        return Play;
      case 'document':
        return FileText;
      case 'quiz':
        return HelpCircle;
      default:
        return Play;
    }
  };

  const getModuleTypeLabel = (type: string) => {
    switch (type) {
      case 'video':
        return 'Vídeo';
      case 'document':
        return 'Documento';
      case 'quiz':
        return 'Quiz';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-2">
      {modules.map((module, index) => {
        const Icon = getModuleIcon(module.type);
        const isCompleted = module.progress?.completed ?? false;
        const isCurrent = module.id === currentModuleId;
        const isClickable = module.isUnlocked && (isCompleted || isCurrent);

        return (
          <button
            key={module.id}
            onClick={() => {
              if (isClickable) {
                onModuleClick(module.id);
              }
            }}
            disabled={!isClickable}
            className={cn(
              'w-full p-4 rounded-xl border transition-all text-left',
              'hover:border-[#1B4D3E]/30 dark:hover:border-[#34D399]/30',
              isCurrent
                ? 'bg-[#1B4D3E]/10 dark:bg-[#34D399]/15 border-[#1B4D3E] dark:border-[#34D399]'
                : isCompleted
                  ? 'bg-[#10B981]/10 border-[#10B981]/30'
                  : module.isUnlocked
                    ? 'bg-[#EDE9E3] dark:bg-[#3D3D3D] border-[#E0DCD6] dark:border-[#3D3D3D]'
                    : 'bg-[#F5F3EF] dark:bg-[#1A1A1A] border-[#E0DCD6] dark:border-[#3D3D3D] opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                  isCurrent
                    ? 'bg-[#1B4D3E] dark:bg-[#34D399] text-white dark:text-[#1A1A1A]'
                    : isCompleted
                      ? 'bg-[#10B981] text-white'
                      : module.isUnlocked
                        ? 'bg-[#E0DCD6] dark:bg-[#3D3D3D] text-[#7A7468] dark:text-[#9A9590]'
                        : 'bg-[#E0DCD6] dark:bg-[#3D3D3D] text-[#B0A99E] dark:text-[#7A7468]'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-[#7A7468] dark:text-[#9A9590]">
                    {index + 1}.
                  </span>
                  <h3
                    className={cn(
                      'text-sm font-medium truncate',
                      isClickable
                        ? 'text-[#2D2A26] dark:text-[#E8E5E0]'
                        : 'text-[#B0A99E] dark:text-[#7A7468]'
                    )}
                  >
                    {module.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="soft" color="gray" className="text-xs">
                    {getModuleTypeLabel(module.type)}
                  </Badge>
                  {module.duration && (
                    <span className="text-xs text-[#7A7468] dark:text-[#9A9590]">
                      {formatDuration(module.duration)}
                    </span>
                  )}
                </div>
              </div>

              {!module.isUnlocked && (
                <Lock className="w-4 h-4 text-[#B0A99E] dark:text-[#7A7468] flex-shrink-0" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
