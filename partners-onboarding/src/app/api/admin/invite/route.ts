import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit';
import type { UserRole } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Verificar se o usuário está autenticado e é admin
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Verificar role do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name, role')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem convidar usuários.' },
        { status: 403 }
      );
    }

    // Ler dados do body
    const body = await request.json();
    const { name, email, area_id, role } = body;

    // Validação
    if (!name || !email || !area_id || !role) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, email, area_id, role' },
        { status: 400 }
      );
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Validar role
    const validRoles: UserRole[] = ['colaborador', 'gestor', 'admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Role inválido' },
        { status: 400 }
      );
    }

    // Criar cliente admin para operações privilegiadas
    const adminClient = createAdminClient();

    // Convidar usuário via Supabase — envia email automaticamente com magic link
    const { data: newAuthUser, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { name },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      });

    if (inviteError || !newAuthUser.user) {
      console.error('Erro ao convidar usuário:', inviteError);
      return NextResponse.json(
        {
          error: 'Erro ao convidar usuário',
          details: inviteError?.message || 'Erro desconhecido',
        },
        { status: 500 }
      );
    }

    // Inserir registro na tabela users
    const { error: insertError } = await adminClient
      .from('users')
      .insert({
        id: newAuthUser.user.id,
        email,
        name,
        area_id,
        role,
      });

    if (insertError) {
      // Se falhar ao inserir na tabela users, deletar o usuário do Auth
      await adminClient.auth.admin.deleteUser(newAuthUser.user.id);
      console.error('Erro ao inserir na tabela users:', insertError);
      return NextResponse.json(
        {
          error: 'Erro ao criar registro do usuário',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    await logAuditAction({
      userId: authUser.id,
      userName: userData.name,
      userRole: 'admin',
      action: 'create',
      entityType: 'user',
      entityId: newAuthUser.user.id,
      entityName: name,
      details: { email, role, area_id },
    });

    return NextResponse.json({
      success: true,
      message: 'Convite enviado com sucesso',
      userId: newAuthUser.user.id,
    });
  } catch (error) {
    console.error('Erro inesperado ao convidar usuário:', error);
    return NextResponse.json(
      {
        error: 'Erro inesperado',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
