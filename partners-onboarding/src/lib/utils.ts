import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classes do Tailwind CSS, resolvendo conflitos
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata uma data para o padrão brasileiro (DD/MM/YYYY)
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Formata uma data para o formato completo em pt-BR (ex: "Segunda-feira, 9 de março de 2026")
 */
export function formatDateFull(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Formata uma duração em minutos para o formato "Xh Ymin"
 */
export function formatDuration(minutes: number): string {
  if (minutes === 0) {
    return '0min';
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}min`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${mins}min`;
}

/**
 * Calcula o progresso percentual baseado em valores completos e totais
 */
export function calculateProgress(completed: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((completed / total) * 100);
}

/**
 * Verifica se uma URL é de vídeo externo (YouTube ou Google Drive)
 */
export function isExternalVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return isYoutubeUrl(url) || isGoogleDriveUrl(url);
}

/**
 * Verifica se é uma URL do YouTube
 */
export function isYoutubeUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com\/(watch|embed|shorts)|youtu\.be\/)/.test(url);
}

/**
 * Verifica se é uma URL do Google Drive
 */
export function isGoogleDriveUrl(url: string): boolean {
  return /^https?:\/\/drive\.google\.com\/file\/d\//.test(url);
}

/**
 * Extrai o ID do vídeo do YouTube a partir da URL
 */
export function getYoutubeVideoId(url: string): string | null {
  // youtube.com/watch?v=ID
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // youtube.com/shorts/ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  return null;
}

/**
 * Converte URL do YouTube para URL de embed
 */
export function getYoutubeEmbedUrl(url: string): string | null {
  const videoId = getYoutubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Extrai o ID do arquivo do Google Drive a partir da URL
 */
export function getGoogleDriveFileId(url: string): string | null {
  const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Converte URL do Google Drive para URL de embed (preview)
 */
export function getGoogleDriveEmbedUrl(url: string): string | null {
  const fileId = getGoogleDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Formata uma data para tempo relativo em português (ex: "há 2h", "há 1 dia")
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) {
    return 'há alguns segundos';
  }

  if (diffInMinutes < 60) {
    return diffInMinutes === 1
      ? 'há 1 minuto'
      : `há ${diffInMinutes} minutos`;
  }

  if (diffInHours < 24) {
    return diffInHours === 1 ? 'há 1 hora' : `há ${diffInHours} horas`;
  }

  if (diffInDays < 30) {
    return diffInDays === 1 ? 'há 1 dia' : `há ${diffInDays} dias`;
  }

  // Se for mais de 30 dias, retorna a data formatada
  return formatDate(dateObj);
}

/**
 * Retorna o status do prazo de uma trilha
 */
export type DeadlineStatus = 'no_deadline' | 'overdue' | 'urgent' | 'warning' | 'ok';

/**
 * Calcula a diferença em dias entre hoje e o deadline,
 * comparando apenas datas (sem horas) para evitar problemas de fuso.
 */
function deadlineDiffDays(deadline: string): number {
  // Extrair só YYYY-MM-DD para evitar conversão de timezone
  const deadlineStr = deadline.split('T')[0];
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Criar datas como meio-dia UTC para comparação sem ambiguidade
  const deadlineMs = new Date(deadlineStr + 'T12:00:00Z').getTime();
  const todayMs = new Date(todayStr + 'T12:00:00Z').getTime();

  return Math.round((deadlineMs - todayMs) / (1000 * 60 * 60 * 24));
}

export function getDeadlineStatus(deadline: string | null): DeadlineStatus {
  if (!deadline) return 'no_deadline';

  const diffDays = deadlineDiffDays(deadline);

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'urgent';
  if (diffDays <= 7) return 'warning';
  return 'ok';
}

/**
 * Formata o prazo para exibição com texto relativo
 */
export function formatDeadline(deadline: string | null): string {
  if (!deadline) return 'Sem prazo';

  const diffDays = deadlineDiffDays(deadline);

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return absDays === 1 ? 'Atrasado 1 dia' : `Atrasado ${absDays} dias`;
  }
  if (diffDays === 0) return 'Vence hoje';
  if (diffDays === 1) return 'Vence amanhã';
  if (diffDays <= 7) return `Vence em ${diffDays} dias`;

  // Formatar a data do deadline sem problema de fuso
  const deadlineStr = deadline.split('T')[0];
  const [year, month, day] = deadlineStr.split('-');
  return `Prazo: ${day}/${month}/${year}`;
}