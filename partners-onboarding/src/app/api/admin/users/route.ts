import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit';

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

    // Excluir dados relacionados do usuário
    await admin.from('quiz_attempts').delete().eq('user_id', id);
    await admin.from('user_progress').delete().eq('user_id', id);
    await admin.from('notifications').delete().eq('user_id', id);
    await admin.from('certificates').delete().eq('user_id', id);

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

    const { id, name, area_id, role } = await request.json();

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
    const changes: Record<string, { de: string | null; para: string | null }> = {};

    if (name !== undefined && name !== targetUser.name) {
      updates.name = name;
      changes.name = { de: targetUser.name, para: name };
    }
    if (role !== undefined && role !== targetUser.role) {
      updates.role = role;
      changes.role = { de: targetUser.role, para: role };
    }
    if (area_id !== undefined && area_id !== targetUser.area_id) {
      updates.area_id = area_id;
      changes.area_id = { de: targetUser.area_id, para: area_id };
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhuma alteração' });
    }

    const { error } = await admin
      .from('users')
      .update(updates)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
