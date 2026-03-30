// Tipos de enum
export type UserRole = 'colaborador' | 'gestor' | 'admin';
export type TrailType = 'obrigatoria_global' | 'obrigatoria_area' | 'optativa_global' | 'optativa_area';
export type ModuleType = 'video' | 'document' | 'quiz';
export type NotificationType = 'atraso' | 'nova_trilha' | 'certificado' | 'quiz_bloqueado';
export type AuditAction = 'create' | 'update' | 'delete';
export type AuditEntityType = 'trail' | 'module' | 'area' | 'user' | 'quiz_question';

// Tipos das tabelas do banco

export interface Area {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  created_at: string;
  deleted_at: string | null;
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
  area_id: string | null; // @deprecated - usar area_ids via trail_areas
  area_ids?: string[]; // populated from trail_areas junction table
  created_by: string;
  duration: number | null; // em minutos
  deadline: string | null; // ISO timestamp ou null = sem prazo
  sort_order: number;
  created_at: string;
  deleted_at: string | null;
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
  deleted_at: string | null;
}

export interface UserProgress {
  id: string;
  user_id: string;
  module_id: string;
  completed: boolean;
  score: number | null;
  time_spent: number | null; // em segundos
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

export interface QuizAttempt {
  id: string;
  user_id: string;
  module_id: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  time_spent: number | null;
  attempt_number: number;
  cycle: number;
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

export interface TrashItem {
  id: string;
  name: string;
  entity_type: 'trail' | 'module' | 'area';
  deleted_at: string;
  days_remaining: number;
  extra?: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: 'admin' | 'gestor';
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
