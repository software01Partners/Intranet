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