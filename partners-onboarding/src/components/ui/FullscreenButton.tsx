'use client';

import { useEffect, useState, RefObject } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface FullscreenButtonProps {
  targetRef: RefObject<HTMLElement | null>;
  className?: string;
}

export function FullscreenButton({ targetRef, className = '' }: FullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = targetRef.current;
    if (!el) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch (err) {
      console.error('Erro ao alternar tela cheia:', err);
    }
  };

  const Icon = isFullscreen ? Minimize2 : Maximize2;

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
      title={isFullscreen ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}
      className={`absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur-sm border border-white/10 transition-colors ${className}`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">
        {isFullscreen ? 'Sair' : 'Tela cheia'}
      </span>
    </button>
  );
}
