import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit';
import type { AuditAction, AuditEntityType } from '@/lib/types';

// POST — registrar log de auditoria (chamado pelo client-side)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('name, role')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (userData.role !== 'admin' && userData.role !== 'gestor') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { action, entityType, entityId, entityName, details } = body as {
      action: AuditAction;
      entityType: AuditEntityType;
      entityId?: string;
      entityName?: string;
      details?: Record<string, unknown>;
    };

    if (!action || !entityType) {
      return NextResponse.json({ error: 'action e entityType são obrigatórios' }, { status: 400 });
    }

    await logAuditAction({
      userId: authUser.id,
      userName: userData.name,
      userRole: userData.role as 'admin' | 'gestor',
      action,
      entityType,
      entityId,
      entityName,
      details,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao registrar log:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// GET — buscar logs de auditoria (apenas admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const userId = searchParams.get('userId');

    const offset = (page - 1) * limit;

    let query = admin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) query = query.eq('action', action);
    if (entityType) query = query.eq('entity_type', entityType);
    if (userId) query = query.eq('user_id', userId);

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Erro na API de logs:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
