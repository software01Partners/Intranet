import { createAdminClient } from '@/lib/supabase/admin';
import type { AuditAction, AuditEntityType } from '@/lib/types';

interface AuditLogParams {
  userId: string;
  userName: string;
  userRole: 'admin' | 'gestor';
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  entityName?: string | null;
  details?: Record<string, unknown>;
}

/**
 * Registra uma ação no log de auditoria.
 * Usar APENAS no servidor (API Routes).
 */
export async function logAuditAction(params: AuditLogParams) {
  try {
    const admin = createAdminClient();
    await admin.from('audit_logs').insert({
      user_id: params.userId,
      user_name: params.userName,
      user_role: params.userRole,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      entity_name: params.entityName || null,
      details: params.details || {},
    });
  } catch (error) {
    // Log de auditoria não deve bloquear a operação principal
    console.error('Erro ao registrar log de auditoria:', error);
  }
}
