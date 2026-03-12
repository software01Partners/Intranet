// Tipos de enum
export type UserRole = 'colaborador' | 'gestor' | 'admin';
export type TrailType = 'obrigatoria_global' | 'obrigatoria_area' | 'optativa';
export type ModuleType = 'video' | 'document' | 'quiz';
export type NotificationType = 'atraso' | 'nova_trilha' | 'certificado';

// Tipos das tabelas do banco

export interface Area {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  area_id: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Trail {
  id: string;
  name: string;
  description: string | null;
  type: TrailType;
  area_id: string | null;
  created_by: string;
  duration: number | null; // em minutos
  sort_order: number;
  created_at: string;
}

export interface Module {
  id: string;
  trail_id: string;
  title: string;
  type: ModuleType;
  content_url: string | null;
  duration: number | null; // em minutos
  sort_order: number;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  module_id: string;
  completed: boolean;
  score: number | null;
  completed_at: string | null;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  module_id: string;
  question: string;
  options: string[]; // array de strings com as opções
  correct_answer: number; // índice da resposta correta
  created_at: string;
}

export interface Certificate {
  id: string;
  user_id: string;
  trail_id: string;
  issued_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  created_at: string;
}
