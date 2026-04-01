import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit';
import { calculateProgress } from '@/lib/utils';
import { getUserAreasMap } from '@/lib/user-areas';

// GET — listar usuários com progresso
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
    const { data: currentUser } = await admin
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Buscar todos os usuários
    const { data: usersData, error } = await admin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!usersData || usersData.length === 0) {
      return NextResponse.json({ users: [], areas: [] });
    }

    // Buscar áreas
    const { data: areasData } = await admin
      .from('areas')
      .select('*')
      .is('deleted_at', null)
      .order('name');

    const areasMap = new Map<string, typeof areasData extends (infer T)[] | null ? T : never>();
    (areasData || []).forEach((area) => areasMap.set(area.id, area));

    // Buscar user_areas para todos os usuários
    const userIds = usersData.map((u) => u.id);
    const userAreasMap = await getUserAreasMap(admin, userIds);

    // Buscar módulos e progresso em batch
    const { data: allModules } = await admin
      .from('modules')
      .select('id')
      .is('deleted_at', null);

    const totalModules = allModules?.length || 0;

    const { data: allProgress } = await admin
      .from('user_progress')
      .select('user_id, module_id, completed');

    const progressByUser = new Map<string, number>();
    if (allProgress && totalModules > 0) {
      const moduleIds = new Set((allModules || []).map((m) => m.id));
      allProgress.forEach((p) => {
        if (p.completed && moduleIds.has(p.module_id)) {
          progressByUser.set(p.user_id, (progressByUser.get(p.user_id) || 0) + 1);
        }
      });
    }

    const users = usersData.map((user) => {
      const areaIds = userAreasMap.get(user.id) || (user.area_id ? [user.area_id] : []);
      const userAreas = areaIds
        .map((aid) => areasMap.get(aid))
        .filter(Boolean);
      return {
        ...user,
        area_ids: areaIds,
        areas: userAreas,
        area: user.area_id ? areasMap.get(user.area_id) || null : null,
        overallProgress: totalModules > 0
          ? calculateProgress(progressByUser.get(user.id) || 0, totalModules)
          : 0,
      };
    });

    return NextResponse.json({ users, areas: areasData || [] });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE — excluir usuário
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: currentUser } = await admin
      .from('users')
      .select('name, role')
      .eq('id', authUser.id)
      .single();

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas admin pode excluir usuários' }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    // Não permitir excluir a si mesmo
    if (id === authUser.id) {
      return NextResponse.json({ error: 'Você não pode excluir sua própria conta' }, { status: 400 });
    }

    // Buscar dados do usuário antes de excluir
    const { data: targetUser } = await admin
      .from('users')
      .select('name, email, role')
      .eq('id', id)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Se o alvo é admin, garantir que pelo menos 1 admin restará
    if (targetUser.role === 'admin') {
      const { count } = await admin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'Não é possível excluir o último administrador do sistema' },
          { status: 400 }
        );
      }
    }

    // Limpar referências FK que apontam para este usuário
    await admin.from('trails').update({ created_by: null }).eq('created_by', id);
    await admin.from('trail_users').update({ assigned_by: null }).eq('assigned_by', id);

    // Excluir dados relacionados do usuário
    await admin.from('quiz_attempts').delete().eq('user_id', id);
    await admin.from('user_progress').delete().eq('user_id', id);
    await admin.from('notifications').delete().eq('user_id', id);
    await admin.from('certificates').delete().eq('user_id', id);
    await admin.from('user_areas').delete().eq('user_id', id);
    await admin.from('trail_users').delete().eq('user_id', id);

    // Excluir registro na tabela users
    const { error: deleteUserError } = await admin
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteUserError) {
      return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
    }

    // Excluir do Auth
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(id);

    if (deleteAuthError) {
      console.error('Erro ao excluir usuário do Auth:', deleteAuthError);
      // Não retorna erro pois o registro já foi removido da tabela users
    }

    await logAuditAction({
      userId: authUser.id,
      userName: currentUser.name,
      userRole: 'admin',
      action: 'delete',
      entityType: 'user',
      entityId: id,
      entityName: targetUser.name,
      details: { email: targetUser.email },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH — editar usuário
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
    const { data: currentUser } = await admin
      .from('users')
      .select('name, role')
      .eq('id', authUser.id)
      .single();

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas admin pode editar usuários' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, role } = body;
    // Support area_ids (array) or area_id (single) for backward compat
    let area_ids: string[] | undefined = body.area_ids;
    if (!area_ids && body.area_id !== undefined) {
      area_ids = body.area_id ? [body.area_id] : [];
    }

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    const { data: targetUser } = await admin
      .from('users')
      .select('name, email, role, area_id')
      .eq('id', id)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const updates: Record<string, string | null> = {};
    const changes: Record<string, { de: string | null; para: string | null } | { de: string[]; para: string[] }> = {};

    if (name !== undefined && name !== targetUser.name) {
      updates.name = name;
      changes.name = { de: targetUser.name, para: name };
    }
    if (role !== undefined && role !== targetUser.role) {
      updates.role = role;
      changes.role = { de: targetUser.role, para: role };
    }

    // Handle area_ids: update user_areas and sync users.area_id
    if (area_ids !== undefined) {
      const newPrimaryArea = area_ids[0] || null;
      if (newPrimaryArea !== targetUser.area_id) {
        updates.area_id = newPrimaryArea;
      }

      // Fetch old area_ids for audit
      const { data: oldUserAreas } = await admin
        .from('user_areas')
        .select('area_id')
        .eq('user_id', id);
      const oldAreaIds = (oldUserAreas || []).map((ua) => ua.area_id);

      // Replace user_areas entries
      await admin.from('user_areas').delete().eq('user_id', id);
      if (area_ids.length > 0) {
        await admin.from('user_areas').insert(
          area_ids.map((areaId) => ({ user_id: id, area_id: areaId }))
        );
      }

      changes.area_ids = { de: oldAreaIds, para: area_ids };
    }

    if (Object.keys(updates).length === 0 && area_ids === undefined) {
      return NextResponse.json({ success: true, message: 'Nenhuma alteração' });
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await admin
        .from('users')
        .update(updates)
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    await logAuditAction({
      userId: authUser.id,
      userName: currentUser.name,
      userRole: 'admin',
      action: 'update',
      entityType: 'user',
      entityId: id,
      entityName: targetUser.name,
      details: changes,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao editar usuário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
