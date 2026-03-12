'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VideoPlayer } from './VideoPlayer';
import { PDFViewer } from './PDFViewer';
import { ModuleList } from './ModuleList';
import { Module, UserProgress, TrailType } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Card, CardContent } from '@/components/ui/Card';
import { formatDuration } from '@/lib/utils';
import { calculateProgress } from '@/lib/utils';
import { Play, Award, HelpCircle } from 'lucide-react';
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

  const handleModuleComplete = () => {
    // Encontrar o próximo módulo não concluído
    const currentIndex = modules.findIndex((m) => m.id === currentModuleId);
    const nextModule = modules
      .slice(currentIndex + 1)
      .find((m) => m.isUnlocked && !m.progress?.completed);

    if (nextModule) {
      // Avançar para o próximo módulo
      router.push(`/trilhas/${trail.id}?modulo=${nextModule.id}`);
      setCurrentModuleId(nextModule.id);
    } else {
      // Era o último módulo
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
      case 'optativa':
        return 'Optativa';
      default:
        return type;
    }
  };

  const getTrailTypeColor = (type: TrailType): 'accent' | 'blue' | 'purple' => {
    switch (type) {
      case 'obrigatoria_global':
        return 'accent';
      case 'obrigatoria_area':
        return 'blue';
      case 'optativa':
        return 'purple';
    }
  };

  if (!currentModule) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#8888A0]">Módulo não encontrado</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
        {/* Coluna Esquerda - Player */}
        <div className="space-y-6">
          {/* Player baseado no tipo */}
          {currentModule.type === 'video' && currentModule.signedUrl && (
            <VideoPlayer
              videoUrl={currentModule.signedUrl}
              moduleId={currentModule.id}
              trailId={trail.id}
              trailName={trail.name}
              onComplete={handleModuleComplete}
            />
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
                  <div className="w-12 h-12 rounded-lg bg-[#E8580C]/10 flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-[#E8580C]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#E8E8ED]">
                      Quiz
                    </h3>
                    <p className="text-sm text-[#8888A0]">
                      Responda as questões para concluir este módulo
                    </p>
                  </div>
                </div>
                <Link href={`/quiz/${currentModule.id}`}>
                  <Button size="lg" className="w-full">
                    Iniciar Quiz
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Informações do módulo */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[#E8E8ED]">
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
                <span className="text-sm text-[#8888A0]">
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
                <h2 className="text-lg font-semibold text-[#E8E8ED] mb-2">
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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#8888A0]">Progresso</span>
                  <span className="text-sm font-medium text-[#E8E8ED]">
                    {trailProgress}%
                  </span>
                </div>
                <ProgressBar value={trailProgress} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-semibold text-[#E8E8ED] mb-4">
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
          <p className="text-[#E8E8ED]">
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
