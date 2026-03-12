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
              'hover:border-[#6B2FA0]/30 dark:hover:border-[#8B5CF6]/30',
              isCurrent
                ? 'bg-[#6B2FA0]/10 dark:bg-[#8B5CF6]/15 border-[#6B2FA0] dark:border-[#8B5CF6]'
                : isCompleted
                  ? 'bg-[#10B981]/10 border-[#10B981]/30'
                  : module.isUnlocked
                    ? 'bg-[#F1F3F8] dark:bg-[#2D2D4A] border-[#E2E5F1] dark:border-[#2D2D4A]'
                    : 'bg-[#F8F9FC] dark:bg-[#0F0F1A] border-[#E2E5F1] dark:border-[#2D2D4A] opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                  isCurrent
                    ? 'bg-[#6B2FA0] dark:bg-[#8B5CF6] text-white'
                    : isCompleted
                      ? 'bg-[#10B981] text-white'
                      : module.isUnlocked
                        ? 'bg-[#E2E5F1] dark:bg-[#2D2D4A] text-[#6B7194] dark:text-[#8888A0]'
                        : 'bg-[#E2E5F1] dark:bg-[#2D2D4A] text-[#9CA3C4] dark:text-[#6B7194]'
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
                  <span className="text-sm font-medium text-[#6B7194] dark:text-[#8888A0]">
                    {index + 1}.
                  </span>
                  <h3
                    className={cn(
                      'text-sm font-medium truncate',
                      isClickable
                        ? 'text-[#1A1D2E] dark:text-[#E8E8ED]'
                        : 'text-[#9CA3C4] dark:text-[#6B7194]'
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
                    <span className="text-xs text-[#6B7194] dark:text-[#8888A0]">
                      {formatDuration(module.duration)}
                    </span>
                  )}
                </div>
              </div>

              {!module.isUnlocked && (
                <Lock className="w-4 h-4 text-[#9CA3C4] dark:text-[#6B7194] flex-shrink-0" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
