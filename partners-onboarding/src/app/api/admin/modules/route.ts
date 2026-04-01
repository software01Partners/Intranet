import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit';

// GET — listar módulos de uma trilha
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
    const { data: userData } = await admin
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (!userData || (userData.role !== 'admin' && userData.role !== 'gestor')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const trailId = searchParams.get('trailId');

    if (!trailId) {
      return NextResponse.json({ error: 'trailId é obrigatório' }, { status: 400 });
    }

    const { data: modules, error } = await admin
      .from('modules')
      .select('*')
      .eq('trail_id', trailId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(modules || []);
  } catch (error) {
    console.error('Erro ao listar módulos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST — criar módulo
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
    const { data: userData } = await admin
      .from('users')
      .select('name, role, area_id')
      .eq('id', authUser.id)
      .single();

    if (!userData || (userData.role !== 'admin' && userData.role !== 'gestor')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { trail_id, title, type, content_url, duration, sort_order } = body;

    if (!trail_id || !title || !type) {
      return NextResponse.json({ error: 'Campos obrigatórios: trail_id, title, type' }, { status: 400 });
    }

    // Gestor: verificar se a trilha pertence à área dele
    if (userData.role === 'gestor') {
      const { data: trailAreas } = await admin
        .from('trail_areas')
        .select('area_id')
        .eq('trail_id', trail_id);

      const trailAreaIds = (trailAreas || []).map((ta) => ta.area_id);
      if (!trailAreaIds.includes(userData.area_id)) {
        return NextResponse.json({ error: 'Sem permissão para esta trilha' }, { status: 403 });
      }
    }

    // Calcular sort_order se não informado
    let finalSortOrder = sort_order ?? 0;
    if (sort_order === undefined || sort_order === null) {
      const { data: existing } = await admin
        .from('modules')
        .select('sort_order')
        .eq('trail_id', trail_id)
        .order('sort_order', { ascending: false })
        .limit(1);

      finalSortOrder = existing && existing.length > 0 ? (existing[0].sort_order || 0) + 1 : 0;
    }

    const { data: newModule, error } = await admin
      .from('modules')
      .insert({
        trail_id,
        title,
        type,
        content_url: content_url || null,
        duration: duration || 0,
        sort_order: finalSortOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditAction({
      userId: authUser.id,
      userName: userData.name,
      userRole: userData.role as 'admin' | 'gestor',
      action: 'create',
      entityType: 'module',
      entityId: newModule.id,
      entityName: title,
      details: { type, trail_id },
    });

    return NextResponse.json(newModule);
  } catch (error) {
    console.error('Erro ao criar módulo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH — atualizar módulo
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: userData } = await admin
      .from('users')
      .select('name, role, area_id')
      .eq('id', authUser.id)
      .single();

    if (!userData || (userData.role !== 'admin' && userData.role !== 'gestor')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { id, trail_id, title, type, content_url, duration, sort_order } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do módulo é obrigatório' }, { status: 400 });
    }

    // Gestor: verificar permissão
    if (userData.role === 'gestor') {
      const { data: module } = await admin
        .from('modules')
        .select('trail_id')
        .eq('id', id)
        .single();

      if (module) {
        const { data: trailAreas } = await admin
          .from('trail_areas')
          .select('area_id')
          .eq('trail_id', module.trail_id);

        const trailAreaIds = (trailAreas || []).map((ta) => ta.area_id);
        if (!trailAreaIds.includes(userData.area_id)) {
          return NextResponse.json({ error: 'Sem permissão para este módulo' }, { status: 403 });
        }
      }
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (type !== undefined) updates.type = type;
    if (content_url !== undefined) updates.content_url = content_url;
    if (duration !== undefined) updates.duration = duration;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (trail_id !== undefined) updates.trail_id = trail_id;

    const { data: updated, error } = await admin
      .from('modules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditAction({
      userId: authUser.id,
      userName: userData.name,
      userRole: userData.role as 'admin' | 'gestor',
      action: 'update',
      entityType: 'module',
      entityId: id,
      entityName: title || updated.title,
      details: updates,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar módulo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
