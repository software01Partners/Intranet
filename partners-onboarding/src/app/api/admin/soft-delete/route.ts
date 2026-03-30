import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit';

type EntityType = 'trail' | 'module' | 'area';

const VALID_ENTITIES: EntityType[] = ['trail', 'module', 'area'];

// POST — soft delete (mover para lixeira)
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
    const { id, entity_type } = body as { id: string; entity_type: EntityType };

    if (!id || !entity_type || !VALID_ENTITIES.includes(entity_type)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    let entityName = 'Item removido';
    const now = new Date().toISOString();

    if (entity_type === 'trail') {
      const { data: trail } = await admin
        .from('trails')
        .select('name')
        .eq('id', id)
        .single();

      if (!trail) {
        return NextResponse.json({ error: 'Trilha não encontrada' }, { status: 404 });
      }

      // Gestor só pode excluir trilhas da própria área (via trail_areas)
      if (userData.role === 'gestor') {
        const { data: trailAreas } = await admin
          .from('trail_areas')
          .select('area_id')
          .eq('trail_id', id);
        const trailAreaIds = (trailAreas || []).map((ta) => ta.area_id);
        if (!trailAreaIds.includes(userData.area_id)) {
          return NextResponse.json({ error: 'Sem permissão para excluir esta trilha' }, { status: 403 });
        }
      }

      entityName = trail.name;
      const { error } = await admin
        .from('trails')
        .update({ deleted_at: now })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else if (entity_type === 'module') {
      const { data: module } = await admin
        .from('modules')
        .select('title, trail_id')
        .eq('id', id)
        .single();

      if (!module) {
        return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 });
      }

      // Gestor: verificar se o módulo pertence a uma trilha da sua área (via trail_areas)
      if (userData.role === 'gestor') {
        const { data: trailAreas } = await admin
          .from('trail_areas')
          .select('area_id')
          .eq('trail_id', module.trail_id);
        const trailAreaIds = (trailAreas || []).map((ta) => ta.area_id);
        if (!trailAreaIds.includes(userData.area_id)) {
          return NextResponse.json({ error: 'Sem permissão para excluir este módulo' }, { status: 403 });
        }
      }

      entityName = module.title;
      const { error } = await admin
        .from('modules')
        .update({ deleted_at: now })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else if (entity_type === 'area') {
      // Apenas admin pode excluir áreas
      if (userData.role !== 'admin') {
        return NextResponse.json({ error: 'Apenas admin pode excluir áreas' }, { status: 403 });
      }

      const { data: area } = await admin
        .from('areas')
        .select('name')
        .eq('id', id)
        .single();

      if (!area) {
        return NextResponse.json({ error: 'Área não encontrada' }, { status: 404 });
      }

      entityName = area.name;
      const { error } = await admin
        .from('areas')
        .update({ deleted_at: now })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    await logAuditAction({
      userId: authUser.id,
      userName: userData.name,
      userRole: userData.role as 'admin' | 'gestor',
      action: 'delete',
      entityType: entity_type,
      entityId: id,
      entityName,
      details: { action: 'soft_delete' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao mover para lixeira:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
