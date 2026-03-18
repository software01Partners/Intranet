import type { AuditAction, AuditEntityType } from '@/lib/types';

/**
 * Registra log de auditoria a partir do client-side.
 * Envia para o endpoint /api/admin/audit-log que valida o usuário.
 */
export async function logAction(params: {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await fetch('/api/admin/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch {
    // Não bloquear a operação principal
  }
}
