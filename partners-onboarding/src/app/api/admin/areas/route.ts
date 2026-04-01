import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit';

// GET — listar áreas com contagens
export async function GET() {
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

    const { data: areasData, error } = await admin
      .from('areas')
      .select('*')
      .is('deleted_at', null)
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!areasData || areasData.length === 0) {
      return NextResponse.json([]);
    }

    const areaIds = areasData.map((a) => a.id);

    const [{ data: userAreasData }, { data: trailAreasData }] = await Promise.all([
      admin.from('user_areas').select('user_id, area_id').in('area_id', areaIds),
      admin.from('trail_areas').select('area_id').in('area_id', areaIds),
    ]);

    const usersCountMap = new Map<string, number>();
    // Count unique users per area (a user in multiple areas counts in each)
    (userAreasData || []).forEach((ua) => {
      if (ua.area_id) {
        usersCountMap.set(ua.area_id, (usersCountMap.get(ua.area_id) || 0) + 1);
      }
    });

    const trailsCountMap = new Map<string, number>();
    (trailAreasData || []).forEach((ta) => {
      if (ta.area_id) {
        trailsCountMap.set(ta.area_id, (trailsCountMap.get(ta.area_id) || 0) + 1);
      }
    });

    const result = areasData.map((area) => ({
      ...area,
      usersCount: usersCountMap.get(area.id) || 0,
      trailsCount: trailsCountMap.get(area.id) || 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao listar áreas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST — criar área
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const admin = createAdminClient();
    const { data: userData } = await admin.from('users').select('name, role').eq('id', authUser.id).single();
    if (!userData || userData.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

    const { name, abbreviation, color } = await request.json();
    if (!name || !abbreviation) return NextResponse.json({ error: 'Nome e abreviação obrigatórios' }, { status: 400 });

    const { data: newArea, error } = await admin.from('areas').insert({ name, abbreviation, color }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAuditAction({ userId: authUser.id, userName: userData.name, userRole: 'admin', action: 'create', entityType: 'area', entityId: newArea.id, entityName: name });

    return NextResponse.json(newArea);
  } catch (error) {
    console.error('Erro ao criar área:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH — atualizar área
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const admin = createAdminClient();
    const { data: userData } = await admin.from('users').select('name, role').eq('id', authUser.id).single();
    if (!userData || userData.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

    const { id, name, abbreviation, color } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const { data: updated, error } = await admin.from('areas').update({ name, abbreviation, color }).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAuditAction({ userId: authUser.id, userName: userData.name, userRole: 'admin', action: 'update', entityType: 'area', entityId: id, entityName: name });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar área:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
