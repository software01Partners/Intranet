'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { FullscreenButton } from '@/components/ui/FullscreenButton';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { CertificateModal } from '@/components/certificate/CertificateModal';
import {
  isYoutubeUrl,
  isGoogleDriveUrl,
  getYoutubeEmbedUrl,
  getGoogleDriveEmbedUrl,
} from '@/lib/utils';

interface CompletePayload {
  trailComplete?: boolean;
  nextModuleId?: string;
}

interface ExternalVideoPlayerProps {
  videoUrl: string;
  moduleId: string;
  trailId: string;
  trailName?: string;
  onComplete: (payload?: CompletePayload) => void;
}

export function ExternalVideoPlayer({
  videoUrl,
  moduleId,
  trailId,
  trailName,
  onComplete,
}: ExternalVideoPlayerProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const viewerRef = useRef<HTMLDivElement>(null);

  // Determinar URL de embed
  let embedUrl: string | null = null;
  if (isYoutubeUrl(videoUrl)) {
    embedUrl = getYoutubeEmbedUrl(videoUrl);
  } else if (isGoogleDriveUrl(videoUrl)) {
    embedUrl = getGoogleDriveEmbedUrl(videoUrl);
  }

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

  if (!embedUrl) {
    return (
      <div className="w-full aspect-video bg-[#1A1A1A] dark:bg-[#262626] rounded-2xl border border-[#E0DCD6] dark:border-[#3D3D3D] flex items-center justify-center">
        <p className="text-[#7A7468] dark:text-[#9A9590]">
          Link de vídeo inválido ou não suportado.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div
        ref={viewerRef}
        className="relative w-full aspect-video bg-[#1A1A1A] dark:bg-[#262626] rounded-2xl overflow-hidden border border-[#E0DCD6] dark:border-[#3D3D3D]"
      >
        <FullscreenButton targetRef={viewerRef} />
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          title="Vídeo do módulo"
        />
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleMarkAsCompleted}
          loading={isCompleting}
          icon={CheckCircle2}
          size="lg"
          variant="primary"
        >
          Marcar como Concluído
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
