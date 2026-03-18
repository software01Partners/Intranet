import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit';

type EntityType = 'trail' | 'module' | 'area';

const VALID_ENTITIES: EntityType[] = ['trail', 'module', 'area'];

async function getAuthenticatedAdmin() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const admin = createAdminClient();
  const { data: userData } = await admin
    .from('users')
    .select('name, role, area_id')
    .eq('id', authUser.id)
    .single();

  if (!userData || userData.role !== 'admin') return null;

  return { authUser, userData, admin };
}

// Buscar item na lixeira por tipo — retorna { name, deleted_at } ou null
async function findTrashItem(
  admin: ReturnType<typeof createAdminClient>,
  entity_type: EntityType,
  id: string
): Promise<{ name: string; deleted_at: string } | null> {
  if (entity_type === 'trail') {
    const { data } = await admin
      .from('trails')
      .select('name, deleted_at')
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .single();
    return data ? { name: data.name, deleted_at: data.deleted_at! } : null;
  }
  if (entity_type === 'module') {
    const { data } = await admin
      .from('modules')
      .select('title, deleted_at')
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .single();
    return data ? { name: data.title, deleted_at: data.deleted_at! } : null;
  }
  if (entity_type === 'area') {
    const { data } = await admin
      .from('areas')
      .select('name, deleted_at')
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .single();
    return data ? { name: data.name, deleted_at: data.deleted_at! } : null;
  }
  return null;
}

// Restaurar item (set deleted_at = null)
async function restoreItem(
  admin: ReturnType<typeof createAdminClient>,
  entity_type: EntityType,
  id: string
) {
  if (entity_type === 'trail') {
    return admin.from('trails').update({ deleted_at: null }).eq('id', id);
  }
  if (entity_type === 'module') {
    return admin.from('modules').update({ deleted_at: null }).eq('id', id);
  }
  return admin.from('areas').update({ deleted_at: null }).eq('id', id);
}

// Hard delete item
async function hardDeleteItem(
  admin: ReturnType<typeof createAdminClient>,
  entity_type: EntityType,
  id: string
) {
  if (entity_type === 'trail') {
    return admin.from('trails').delete().eq('id', id);
  }
  if (entity_type === 'module') {
    return admin.from('modules').delete().eq('id', id);
  }
  return admin.from('areas').delete().eq('id', id);
}

// GET — listar itens na lixeira
export async function GET() {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { admin } = auth;

    // Buscar trilhas deletadas
    const { data: trails } = await admin
      .from('trails')
      .select('id, name, type, area_id, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    // Buscar módulos deletados
    const { data: modules } = await admin
      .from('modules')
      .select('id, title, trail_id, type, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    // Buscar áreas deletadas
    const { data: areas } = await admin
      .from('areas')
      .select('id, name, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    const now = new Date();

    const calcDaysRemaining = (deletedAt: string) =>
      Math.max(0, 30 - Math.floor((now.getTime() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24)));

    const items = [
      ...(trails || []).map((t) => ({
        id: t.id,
        name: t.name,
        entity_type: 'trail' as const,
        deleted_at: t.deleted_at!,
        days_remaining: calcDaysRemaining(t.deleted_at!),
        extra: { type: t.type, area_id: t.area_id },
      })),
      ...(modules || []).map((m) => ({
        id: m.id,
        name: m.title,
        entity_type: 'module' as const,
        deleted_at: m.deleted_at!,
        days_remaining: calcDaysRemaining(m.deleted_at!),
        extra: { trail_id: m.trail_id, type: m.type },
      })),
      ...(areas || []).map((a) => ({
        id: a.id,
        name: a.name,
        entity_type: 'area' as const,
        deleted_at: a.deleted_at!,
        days_remaining: calcDaysRemaining(a.deleted_at!),
      })),
    ];

    // Ordenar por deleted_at mais recente
    items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

    return NextResponse.json(items);
  } catch (error) {
    console.error('Erro ao listar lixeira:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST — restaurar item da lixeira
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { authUser, userData, admin } = auth;
    const body = await request.json();
    const { id, entity_type } = body as { id: string; entity_type: EntityType };

    if (!id || !entity_type || !VALID_ENTITIES.includes(entity_type)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const item = await findTrashItem(admin, entity_type, id);
    if (!item) {
      return NextResponse.json({ error: 'Item não encontrado na lixeira' }, { status: 404 });
    }

    const { error } = await restoreItem(admin, entity_type, id);
    if (error) {
      console.error('Erro ao restaurar item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditAction({
      userId: authUser.id,
      userName: userData.name,
      userRole: 'admin',
      action: 'update',
      entityType: entity_type,
      entityId: id,
      entityName: item.name,
      details: { action: 'restore_from_trash' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao restaurar item:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE — excluir permanentemente
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { authUser, userData, admin } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const entity_type = searchParams.get('entity_type') as EntityType;

    if (!id || !entity_type || !VALID_ENTITIES.includes(entity_type)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const item = await findTrashItem(admin, entity_type, id);
    if (!item) {
      return NextResponse.json({ error: 'Item não encontrado na lixeira' }, { status: 404 });
    }

    const { error } = await hardDeleteItem(admin, entity_type, id);
    if (error) {
      console.error('Erro ao excluir permanentemente:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditAction({
      userId: authUser.id,
      userName: userData.name,
      userRole: 'admin',
      action: 'delete',
      entityType: entity_type,
      entityId: id,
      entityName: item.name,
      details: { action: 'permanent_delete' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir permanentemente:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
