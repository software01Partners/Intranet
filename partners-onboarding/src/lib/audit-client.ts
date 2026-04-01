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
    const response = await fetch('/api/admin/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      console.warn('[Audit] Falha ao registrar log:', response.status, await response.text().catch(() => ''));
    }
  } catch (error) {
    console.warn('[Audit] Erro ao registrar log:', error);
  }
}
