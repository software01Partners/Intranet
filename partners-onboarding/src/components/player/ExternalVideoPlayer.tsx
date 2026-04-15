'use client';

import { useState, useRef, useEffect } from 'react';
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
  duration: number | null; // em minutos
  alreadyCompleted?: boolean;
  onComplete: (payload?: CompletePayload) => void;
}

type YTPlayer = {
  destroy: () => void;
  getDuration?: () => number;
  getCurrentTime?: () => number;
};
interface YTWindow {
  YT?: {
    Player: new (
      el: HTMLIFrameElement,
      opts: {
        events: {
          onReady?: (e: { target: YTPlayer }) => void;
          onStateChange: (e: { data: number; target: YTPlayer }) => void;
        };
      }
    ) => YTPlayer;
    PlayerState: { ENDED: number; PLAYING: number };
  };
  onYouTubeIframeAPIReady?: () => void;
}

function safeGetDuration(p: YTPlayer | null): number | null {
  if (!p || typeof p.getDuration !== 'function') return null;
  try {
    const d = p.getDuration();
    return typeof d === 'number' && d > 0 ? d : null;
  } catch {
    return null;
  }
}

export function ExternalVideoPlayer({
  videoUrl,
  moduleId,
  trailId,
  trailName,
  duration,
  alreadyCompleted = false,
  onComplete,
}: ExternalVideoPlayerProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [ytDurationSec, setYtDurationSec] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const viewerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);

  const isYT = isYoutubeUrl(videoUrl);
  const isDrive = isGoogleDriveUrl(videoUrl);

  let embedUrl: string | null = null;
  if (isYT) {
    const base = getYoutubeEmbedUrl(videoUrl);
    embedUrl = base ? `${base}?enablejsapi=1&rel=0` : null;
  } else if (isDrive) {
    embedUrl = getGoogleDriveEmbedUrl(videoUrl);
  }

  // Tempo mínimo de exibição — 90% da duração, evita exigir fim exato.
  // YouTube: pega duração real via API (ytDurationSec). Drive: depende do campo do banco.
  const durationSec = isYT
    ? ytDurationSec
    : duration && duration > 0
      ? duration * 60
      : null;
  const requiredSeconds =
    durationSec !== null ? Math.floor(durationSec * 0.9) : null;

  useEffect(() => {
    if (videoFinished) return;
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [videoFinished]);

  // YouTube IFrame API — detecta fim real do vídeo
  useEffect(() => {
    if (!isYT || !iframeRef.current) return;

    const w = window as unknown as YTWindow;
    let player: YTPlayer | null = null;

    const initPlayer = () => {
      if (!w.YT || !iframeRef.current) return;
      player = new w.YT.Player(iframeRef.current, {
        events: {
          onReady: () => {
            ytPlayerRef.current = player;
            const d = safeGetDuration(player);
            if (d !== null) setYtDurationSec(d);
          },
          onStateChange: (e) => {
            if (!w.YT) return;
            if (e.data === w.YT.PlayerState.PLAYING) {
              const d = safeGetDuration(ytPlayerRef.current ?? player);
              if (d !== null) {
                setYtDurationSec((prev) => prev ?? d);
              }
            }
            if (e.data === w.YT.PlayerState.ENDED) {
              setVideoFinished(true);
            }
          },
        },
      });
      ytPlayerRef.current = player;
    };

    if (w.YT && w.YT.Player) {
      initPlayer();
    } else {
      const existing = document.getElementById('youtube-iframe-api');
      if (!existing) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      const prevReady = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prevReady?.();
        initPlayer();
      };
    }

    return () => {
      player?.destroy();
    };
  }, [isYT, embedUrl]);

  const timerElapsed = requiredSeconds !== null && elapsedSec >= requiredSeconds;
  // Drive sem duração cadastrada: libera (não temos como medir sem API de player).
  const driveUnblocked = isDrive && requiredSeconds === null;
  const canComplete =
    alreadyCompleted || videoFinished || timerElapsed || driveUnblocked;

  const remainingSec =
    requiredSeconds !== null ? Math.max(0, requiredSeconds - elapsedSec) : 0;
  const mm = Math.floor(remainingSec / 60).toString().padStart(2, '0');
  const ss = (remainingSec % 60).toString().padStart(2, '0');

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

  let buttonLabel: string;
  if (canComplete) {
    buttonLabel = 'Marcar como Concluído';
  } else if (requiredSeconds !== null) {
    buttonLabel = `Assista o vídeo (${mm}:${ss})`;
  } else {
    buttonLabel = 'Carregando vídeo...';
  }

  return (
    <div className="w-full space-y-4">
      <div
        ref={viewerRef}
        className="relative w-full aspect-video bg-[#1A1A1A] dark:bg-[#262626] rounded-2xl overflow-hidden border border-[#E0DCD6] dark:border-[#3D3D3D]"
      >
        <FullscreenButton targetRef={viewerRef} />
        <iframe
          ref={iframeRef}
          id={`external-video-${moduleId}`}
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
          icon={canComplete ? CheckCircle2 : undefined}
          size="lg"
          disabled={!canComplete}
          variant={canComplete ? 'primary' : 'secondary'}
          className={!canComplete ? 'opacity-70 cursor-not-allowed' : ''}
        >
          {buttonLabel}
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
