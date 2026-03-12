'use client';

import { useState, useRef } from 'react';
import ReactPlayer from 'react-player';
import { Button } from '@/components/ui/Button';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { CertificateModal } from '@/components/certificate/CertificateModal';

interface VideoPlayerProps {
  videoUrl: string;
  moduleId: string;
  trailId: string;
  trailName?: string;
  onComplete: () => void;
}

export function VideoPlayer({
  videoUrl,
  moduleId,
  trailId,
  trailName,
  onComplete,
}: VideoPlayerProps) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const playerRef = useRef<ReactPlayer>(null);

  const handleEnded = () => {
    setIsCompleted(true);
  };

  const handleMarkAsCompleted = async () => {
    setIsCompleting(true);

    try {
      const response = await fetch('/api/progress/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ module_id: moduleId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao marcar como concluído');
      }

      toast.success('Módulo marcado como concluído!');
      
      // Se a trilha foi concluída, mostrar modal de certificado
      if (data.trailComplete && data.trailId) {
        setShowCertificateModal(true);
      }
      
      onComplete();
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
      <div className="relative w-full aspect-video bg-[#0A0A0F] rounded-xl overflow-hidden border border-[#262630]">
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          width="100%"
          height="100%"
          controls
          playing
          onEnded={handleEnded}
          config={{
            file: {
              attributes: {
                controlsList: 'nodownload',
              },
            },
          }}
        />
      </div>

      {isCompleted && (
        <div className="flex justify-center">
          <Button
            onClick={handleMarkAsCompleted}
            loading={isCompleting}
            icon={CheckCircle2}
            size="lg"
          >
            Marcar como Concluído
          </Button>
        </div>
      )}

      <CertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        trailId={trailId}
        trailName={trailName}
      />
    </div>
  );
}
