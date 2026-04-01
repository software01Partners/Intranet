'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { CertificateModal } from '@/components/certificate/CertificateModal';

interface CompletePayload {
  trailComplete?: boolean;
  nextModuleId?: string;
}

interface VideoPlayerProps {
  videoUrl: string;
  moduleId: string;
  trailId: string;
  trailName?: string;
  onComplete: (payload?: CompletePayload) => void;
}

export function VideoPlayer({
  videoUrl,
  moduleId,
  trailId,
  trailName,
  onComplete,
}: VideoPlayerProps) {
  const [videoFinished, setVideoFinished] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  const handleEnded = () => {
    setVideoFinished(true);
  };

  const handleMarkAsCompleted = async () => {
    setIsCompleting(true);

    try {
      const response = await fetch('/api/progress/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          module_id: moduleId,
          time_spent: Math.round((Date.now() - startTimeRef.current) / 1000),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao marcar como concluído');
      }

      toast.success('Módulo marcado como concluído!');

      if (data.trailComplete && data.trailId) {
        setShowCertificateModal(true);
      }

      onComplete({
        trailComplete: data.trailComplete,
        nextModuleId: data.nextModuleId,
      });
    } catch (error) {
      console.error('Erro ao completar módulo:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao marcar como concluído'
      );
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="relative w-full aspect-video bg-[#1A1A1A] dark:bg-[#262626] rounded-2xl overflow-hidden border border-[#E0DCD6] dark:border-[#3D3D3D]">
        <video
          src={videoUrl}
          controls
          autoPlay={false}
          onEnded={handleEnded}
          className="w-full h-full object-contain"
          controlsList="nodownload"
        >
          Seu navegador não suporta vídeos.
        </video>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleMarkAsCompleted}
          loading={isCompleting}
          icon={videoFinished ? CheckCircle2 : undefined}
          size="lg"
          disabled={!videoFinished}
          variant={videoFinished ? 'primary' : 'secondary'}
          className={!videoFinished ? 'opacity-70 cursor-not-allowed' : ''}
        >
          {videoFinished ? 'Marcar como Concluído' : 'Assista o vídeo completo'}
        </Button>
      </div>

      <CertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        trailId={trailId}
        trailName={trailName}
      />
    </div>
  );
}
