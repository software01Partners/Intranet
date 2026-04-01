'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VideoPlayer } from './VideoPlayer';
import { ExternalVideoPlayer } from './ExternalVideoPlayer';
import { PDFViewer } from './PDFViewer';
import { ModuleList } from './ModuleList';
import { Module, UserProgress, TrailType } from '@/lib/types';
import { isExternalVideoUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Card, CardContent } from '@/components/ui/Card';
import { formatDuration, formatDeadline, getDeadlineStatus } from '@/lib/utils';
import { calculateProgress } from '@/lib/utils';
import { Play, Award, HelpCircle, CalendarClock } from 'lucide-react';
import Link from 'next/link';

interface ModuleWithProgress extends Module {
  progress: UserProgress | null;
  isUnlocked: boolean;
  signedUrl?: string;
}

interface TrailPlayerClientProps {
  trail: {
    id: string;
    name: string;
    type: TrailType;
    deadline: string | null;
  };
  modules: ModuleWithProgress[];
  initialModuleId: string;
  trailProgress: number;
}

export function TrailPlayerClient({
  trail,
  modules,
  initialModuleId,
  trailProgress,
}: TrailPlayerClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentModuleId, setCurrentModuleId] = useState(initialModuleId);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isLastModule, setIsLastModule] = useState(false);

  const currentModule = modules.find((m) => m.id === currentModuleId);

  useEffect(() => {
    // Verificar se há módulo na query string
    const moduleParam = searchParams.get('modulo');
    if (moduleParam && modules.find((m) => m.id === moduleParam)) {
      setCurrentModuleId(moduleParam);
    }
  }, [searchParams, modules]);

  type CompletePayload = {
    trailComplete?: boolean;
    nextModuleId?: string;
  };

  const handleModuleComplete = (payload?: CompletePayload) => {
    // Usar resposta da API quando disponível (fonte de verdade após marcar concluído)
    if (payload?.trailComplete === true) {
      setIsLastModule(true);
      setShowCompletionModal(true);
      return;
    }
    if (payload?.nextModuleId) {
      router.push(`/trilhas/${trail.id}?modulo=${payload.nextModuleId}`);
      setCurrentModuleId(payload.nextModuleId);
      return;
    }
    // Fallback: usar lista de módulos (pode estar desatualizada até refresh)
    const currentIndex = modules.findIndex((m) => m.id === currentModuleId);
    const nextModule = modules
      .slice(currentIndex + 1)
      .find((m) => m.isUnlocked && !m.progress?.completed);
    if (nextModule) {
      router.push(`/trilhas/${trail.id}?modulo=${nextModule.id}`);
      setCurrentModuleId(nextModule.id);
    } else {
      setIsLastModule(true);
      setShowCompletionModal(true);
    }
  };

  const handleModuleClick = (moduleId: string) => {
    router.push(`/trilhas/${trail.id}?modulo=${moduleId}`);
    setCurrentModuleId(moduleId);
  };

  const getTrailTypeLabel = (type: TrailType) => {
    switch (type) {
      case 'obrigatoria_global':
        return 'Obrigatória Global';
      case 'obrigatoria_area':
        return 'Obrigatória da Área';
      case 'optativa_global':
        return 'Optativa Global';
      case 'optativa_area':
        return 'Optativa da Área';
      default:
        return type;
    }
  };

  const getTrailTypeColor = (type: TrailType): 'obrigatoria_global' | 'obrigatoria_area' | 'optativa_global' | 'optativa_area' => {
    switch (type) {
      case 'obrigatoria_global':
        return 'obrigatoria_global';
      case 'obrigatoria_area':
        return 'obrigatoria_area';
      case 'optativa_global':
        return 'optativa_global';
      case 'optativa_area':
        return 'optativa_area';
    }
  };

  if (!currentModule) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#7A7468] dark:text-[#9A9590]">Módulo não encontrado</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
        {/* Coluna Esquerda - Player */}
        <div className="space-y-6">
          {/* Player baseado no tipo */}
          {currentModule.type === 'video' && currentModule.signedUrl && isExternalVideoUrl(currentModule.signedUrl) && (
            <ExternalVideoPlayer
              videoUrl={currentModule.signedUrl}
              moduleId={currentModule.id}
              trailId={trail.id}
              trailName={trail.name}
              onComplete={handleModuleComplete}
            />
          )}

          {currentModule.type === 'video' && currentModule.signedUrl && !isExternalVideoUrl(currentModule.signedUrl) && (
            <VideoPlayer
              videoUrl={currentModule.signedUrl}
              moduleId={currentModule.id}
              trailId={trail.id}
              trailName={trail.name}
              onComplete={handleModuleComplete}
            />
          )}

          {currentModule.type === 'video' && !currentModule.signedUrl && (
            <div className="w-full aspect-video bg-[#1A1A1A] dark:bg-[#262626] rounded-2xl border border-[#E0DCD6] dark:border-[#3D3D3D] flex items-center justify-center">
              <p className="text-[#7A7468] dark:text-[#9A9590]">
                Vídeo indisponível. Verifique se o arquivo está no R2 e se content_url é a chave (ex: videos/trailId/arquivo.mp4).
              </p>
            </div>
          )}

          {currentModule.type === 'document' && currentModule.signedUrl && (
            <PDFViewer
              pdfUrl={currentModule.signedUrl}
              moduleId={currentModule.id}
              trailId={trail.id}
              trailName={trail.name}
              onComplete={handleModuleComplete}
            />
          )}

          {currentModule.type === 'quiz' && (
            <Card>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#D4A053]/10 dark:bg-[#D4A053]/15 flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-[#D4A053]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#2D2A26] dark:text-[#E8E5E0]">
                      Quiz
                    </h3>
                    <p className="text-sm text-[#7A7468] dark:text-[#9A9590]">
                      Responda as questões para concluir este módulo
                    </p>
                  </div>
                </div>
                {currentModule.progress?.completed ? (
                  <Button size="lg" className="w-full" disabled>
                    Quiz já concluído
                  </Button>
                ) : !currentModule.isUnlocked ? (
                  <Button size="lg" className="w-full" disabled>
                    Módulo bloqueado
                  </Button>
                ) : (
                  <Link href={`/quiz/${currentModule.id}`}>
                    <Button size="lg" className="w-full">
                      Iniciar Quiz
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          )}

          {/* Informações do módulo */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[#2D2A26] dark:text-[#E8E5E0]">
              {currentModule.title}
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant="soft" color="gray">
                {currentModule.type === 'video'
                  ? 'Vídeo'
                  : currentModule.type === 'document'
                    ? 'Documento'
                    : 'Quiz'}
              </Badge>
              {currentModule.duration && (
                <span className="text-sm text-[#7A7468] dark:text-[#9A9590]">
                  {formatDuration(currentModule.duration)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Direita - Lista de Módulos */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#2D2A26] dark:text-[#E8E5E0] mb-2">
                  {trail.name}
                </h2>
                <Badge
                  variant="soft"
                  color={getTrailTypeColor(trail.type)}
                  className="mb-4"
                >
                  {getTrailTypeLabel(trail.type)}
                </Badge>
              </div>

              {trail.deadline && trailProgress < 100 && (() => {
                const status = getDeadlineStatus(trail.deadline);
                const deadlineColorClass =
                  status === 'overdue' ? 'text-red-500' :
                  status === 'urgent' ? 'text-orange-500' :
                  status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-[#7A7468] dark:text-[#9A9590]';
                return (
                  <div className={`flex items-center gap-2 text-sm ${deadlineColorClass} pb-2`}>
                    <CalendarClock className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{formatDeadline(trail.deadline)}</span>
                  </div>
                );
              })()}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#7A7468] dark:text-[#9A9590]">Progresso</span>
                  <span className="text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0]">
                    {trailProgress}%
                  </span>
                </div>
                <ProgressBar value={trailProgress} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-bold text-[#2D2A26] dark:text-[#E8E5E0] mb-4">
              Módulos
            </h3>
            <ModuleList
              modules={modules}
              currentModuleId={currentModuleId}
              onModuleClick={handleModuleClick}
            />
          </Card>
        </div>
      </div>

      {/* Modal de Conclusão */}
      <Modal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        title="Parabéns! 🎉"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-[#2D2A26] dark:text-[#E8E5E0]">
            Você concluiu todos os módulos desta trilha!
          </p>
          <div className="flex gap-3">
            <Link href="/certificados" className="flex-1">
              <Button icon={Award} className="w-full" size="lg">
                Ver Certificado
              </Button>
            </Link>
            <Link href="/trilhas" className="flex-1">
              <Button variant="secondary" className="w-full" size="lg">
                Ver Outras Trilhas
              </Button>
            </Link>
          </div>
        </div>
      </Modal>
    </>
  );
}
