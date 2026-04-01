import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit';
import { getTrailUsersMap } from '@/lib/trail-users';

// GET — listar trilhas (admin vê todas, gestor vê da área)
export async function GET(request: Request) {
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
      .select('role, area_id')
      .eq('id', authUser.id)
      .single();

    if (!userData || (userData.role !== 'admin' && userData.role !== 'gestor')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const areaFilter = searchParams.get('areaFilter');

    let trails;
    const { data: allTrails, error } = await admin
      .from('trails')
      .select('*')
      .is('deleted_at', null)
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    trails = allTrails || [];

    // Se gestor ou filtro de área, filtrar por trail_areas
    const filterArea = userData.role === 'gestor' ? userData.area_id : areaFilter;
    if (filterArea && filterArea !== 'all') {
      const trailIds = trails.map((t) => t.id);
      if (trailIds.length > 0) {
        const { data: trailAreas } = await admin
          .from('trail_areas')
          .select('trail_id')
          .eq('area_id', filterArea)
          .in('trail_id', trailIds);

        const allowedIds = new Set((trailAreas || []).map((ta) => ta.trail_id));
        trails = trails.filter((t) => allowedIds.has(t.id));
      }
    }

    // Buscar trail_areas, módulos e criadores em batch
    if (trails.length > 0) {
      const trailIds = trails.map((t) => t.id);
      const creatorIds = [...new Set(trails.map((t) => t.created_by).filter(Boolean))];

      const [{ data: allTrailAreas }, { data: allModules }, { data: creatorsData }, trailUsersMap] = await Promise.all([
        admin.from('trail_areas').select('trail_id, area_id').in('trail_id', trailIds),
        admin.from('modules').select('trail_id').is('deleted_at', null).in('trail_id', trailIds),
        creatorIds.length > 0
          ? admin.from('users').select('id, name, email').in('id', creatorIds)
          : Promise.resolve({ data: [] }),
        getTrailUsersMap(admin, trailIds),
      ]);

      const areasMap = new Map<string, string[]>();
      (allTrailAreas || []).forEach((ta) => {
        const existing = areasMap.get(ta.trail_id) || [];
        existing.push(ta.area_id);
        areasMap.set(ta.trail_id, existing);
      });

      const modulesCountMap = new Map<string, number>();
      (allModules || []).forEach((m) => {
        modulesCountMap.set(m.trail_id, (modulesCountMap.get(m.trail_id) || 0) + 1);
      });

      const creatorsMap = new Map<string, string>();
      (creatorsData || []).forEach((u) => {
        creatorsMap.set(u.id, u.name || u.email);
      });

      trails = trails.map((t) => ({
        ...t,
        area_ids: areasMap.get(t.id) || [],
        user_ids: trailUsersMap.get(t.id) || [],
        modulesCount: modulesCountMap.get(t.id) || 0,
        creatorName: creatorsMap.get(t.created_by) || null,
      }));
    }

    return NextResponse.json(trails);
  } catch (error) {
    console.error('Erro ao listar trilhas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST — criar trilha
export async function POST(request: Request) {
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
      .select('name, role, area_id')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (userData.role !== 'admin' && userData.role !== 'gestor') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, type, area_ids, duration, deadline, user_ids } = body;

    const isAreaType = type === 'obrigatoria_area' || type === 'optativa_area';

    // Determinar lista de áreas
    let resolvedAreaIds: string[] = [];
    const resolvedUserIds: string[] = Array.isArray(user_ids) ? user_ids : [];
    if (isAreaType) {
      if (Array.isArray(area_ids) && area_ids.length > 0) {
        resolvedAreaIds = area_ids;
      } else if (body.area_id) {
        resolvedAreaIds = [body.area_id];
      } else if (resolvedUserIds.length === 0) {
        // Só exige área se não tem colaboradores individuais
        return NextResponse.json(
          { error: 'Selecione pelo menos uma área ou colaborador individual' },
          { status: 400 }
        );
      }
    }

    // Gestor só pode criar trilhas da própria área
    if (userData.role === 'gestor') {
      if (!isAreaType) {
        return NextResponse.json(
          { error: 'Gestor só pode criar trilhas da própria área' },
          { status: 403 }
        );
      }
      const hasInvalidArea = resolvedAreaIds.some((aid) => aid !== userData.area_id);
      if (hasInvalidArea) {
        return NextResponse.json(
          { error: 'Gestor só pode criar trilhas da própria área' },
          { status: 403 }
        );
      }
    }

    // Criar a trilha (uma única trilha)
    const { data: trail, error } = await admin
      .from('trails')
      .insert({
        name,
        description: description || null,
        type,
        area_id: null, // deprecated - usar trail_areas
        duration: duration || 0,
        deadline: deadline || null,
        created_by: authUser.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar trilha:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Inserir relações trail_areas
    if (resolvedAreaIds.length > 0) {
      const trailAreasToInsert = resolvedAreaIds.map((areaId) => ({
        trail_id: trail.id,
        area_id: areaId,
      }));

      const { error: taError } = await admin
        .from('trail_areas')
        .insert(trailAreasToInsert);

      if (taError) {
        console.error('Erro ao vincular áreas:', taError);
        // Rollback: deletar a trilha criada
        await admin.from('trails').delete().eq('id', trail.id);
        return NextResponse.json({ error: taError.message }, { status: 500 });
      }
    }

    // Inserir trail_users (atribuição individual)
    if (resolvedUserIds.length > 0) {
      const { error: tuError } = await admin
        .from('trail_users')
        .insert(resolvedUserIds.map((uid) => ({ trail_id: trail.id, user_id: uid })));

      if (tuError) {
        console.error('Erro ao vincular usuários à trilha:', tuError);
      }
    }

    await logAuditAction({
      userId: authUser.id,
      userName: userData.name,
      userRole: userData.role as 'admin' | 'gestor',
      action: 'create',
      entityType: 'trail',
      entityId: trail.id,
      entityName: name,
      details: { type, area_ids: resolvedAreaIds, user_ids: resolvedUserIds },
    });

    return NextResponse.json({ ...trail, area_ids: resolvedAreaIds, user_ids: resolvedUserIds });
  } catch (error) {
    console.error('Erro na API de trilhas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT — atualizar trilha
export async function PUT(request: Request) {
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
      .select('name, role, area_id')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (userData.role !== 'admin' && userData.role !== 'gestor') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, type, area_ids, duration, deadline, user_ids } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da trilha é obrigatório' }, { status: 400 });
    }

    const isAreaType = type === 'obrigatoria_area' || type === 'optativa_area';

    // Determinar áreas
    let resolvedAreaIds: string[] = [];
    if (isAreaType) {
      if (Array.isArray(area_ids) && area_ids.length > 0) {
        resolvedAreaIds = area_ids;
      } else if (body.area_id) {
        resolvedAreaIds = [body.area_id];
      } else {
        return NextResponse.json(
          { error: 'Selecione pelo menos uma área' },
          { status: 400 }
        );
      }
    }

    // Gestor só pode editar trilhas da própria área
    if (userData.role === 'gestor') {
      const { data: existingAreas } = await admin
        .from('trail_areas')
        .select('area_id')
        .eq('trail_id', id);

      const trailAreaIds = (existingAreas || []).map((ta) => ta.area_id);
      if (!trailAreaIds.includes(userData.area_id)) {
        return NextResponse.json({ error: 'Sem permissão para editar esta trilha' }, { status: 403 });
      }
    }

    // Atualizar trilha
    const { data: trail, error } = await admin
      .from('trails')
      .update({
        name,
        description: description || null,
        type,
        area_id: null, // deprecated
        duration: duration || 0,
        deadline: deadline || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar trilha:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Atualizar trail_areas: salvar antigas para rollback, deletar e inserir novas
    const { data: oldTrailAreas } = await admin
      .from('trail_areas')
      .select('trail_id, area_id')
      .eq('trail_id', id);

    await admin.from('trail_areas').delete().eq('trail_id', id);

    if (resolvedAreaIds.length > 0) {
      const trailAreasToInsert = resolvedAreaIds.map((areaId) => ({
        trail_id: id,
        area_id: areaId,
      }));

      const { error: taError } = await admin
        .from('trail_areas')
        .insert(trailAreasToInsert);

      if (taError) {
        console.error('Erro ao atualizar áreas da trilha:', taError);
        // Rollback: restaurar áreas anteriores
        if (oldTrailAreas && oldTrailAreas.length > 0) {
          await admin.from('trail_areas').insert(oldTrailAreas);
        }
        return NextResponse.json({ error: taError.message }, { status: 500 });
      }
    }

    // Atualizar trail_users (atribuição individual)
    const resolvedUserIds: string[] = Array.isArray(user_ids) ? user_ids : [];
    if (user_ids !== undefined) {
      await admin.from('trail_users').delete().eq('trail_id', id);
      if (resolvedUserIds.length > 0) {
        const { error: tuError } = await admin
          .from('trail_users')
          .insert(resolvedUserIds.map((uid) => ({ trail_id: id, user_id: uid })));

        if (tuError) {
          console.error('Erro ao atualizar usuários da trilha:', tuError);
        }
      }
    }

    await logAuditAction({
      userId: authUser.id,
      userName: userData.name,
      userRole: userData.role as 'admin' | 'gestor',
      action: 'update',
      entityType: 'trail',
      entityId: id,
      entityName: name,
      details: { type, area_ids: resolvedAreaIds, user_ids: resolvedUserIds },
    });

    return NextResponse.json({ ...trail, area_ids: resolvedAreaIds, user_ids: resolvedUserIds });
  } catch (error) {
    console.error('Erro na API de trilhas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE — excluir trilha
export async function DELETE(request: Request) {
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
      .select('name, role, area_id')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (userData.role !== 'admin' && userData.role !== 'gestor') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID da trilha é obrigatório' }, { status: 400 });
    }

    // Buscar nome da trilha antes de deletar (para o log)
    const { data: trailData } = await admin
      .from('trails')
      .select('name')
      .eq('id', id)
      .single();

    // Gestor só pode deletar trilhas da própria área
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

    const { error } = await admin
      .from('trails')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir trilha:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditAction({
      userId: authUser.id,
      userName: userData.name,
      userRole: userData.role as 'admin' | 'gestor',
      action: 'delete',
      entityType: 'trail',
      entityId: id,
      entityName: trailData?.name || 'Trilha removida',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API de trilhas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
