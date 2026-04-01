import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const createNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()),
  type: z.enum(['atraso', 'nova_trilha', 'certificado']),
  message: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticação
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar role (gestor ou admin)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, area_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Erro ao verificar permissões' },
        { status: 500 }
      );
    }

    if (userData.role !== 'gestor' && userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas gestores e admins podem criar notificações.' },
        { status: 403 }
      );
    }

    // Validar body
    const body = await request.json();
    const validatedData = createNotificationSchema.parse(body);

    // Gestor só pode notificar usuários que compartilham pelo menos uma área
    if (userData.role === 'gestor') {
      const admin = createAdminClient();

      // Fetch gestor's areas from user_areas
      const { data: gestorAreas } = await admin
        .from('user_areas')
        .select('area_id')
        .eq('user_id', user.id);

      const gestorAreaIds = (gestorAreas || []).map((ga) => ga.area_id);
      // Fallback to deprecated area_id
      if (gestorAreaIds.length === 0 && userData.area_id) {
        gestorAreaIds.push(userData.area_id);
      }

      if (gestorAreaIds.length === 0) {
        return NextResponse.json(
          { error: 'Gestor não possui área definida' },
          { status: 403 }
        );
      }

      // Fetch target users' areas
      const { data: targetUserAreas } = await admin
        .from('user_areas')
        .select('user_id, area_id')
        .in('user_id', validatedData.userIds);

      const targetAreasMap = new Map<string, string[]>();
      (targetUserAreas || []).forEach((tua) => {
        const existing = targetAreasMap.get(tua.user_id) || [];
        existing.push(tua.area_id);
        targetAreasMap.set(tua.user_id, existing);
      });

      const outsideArea = validatedData.userIds.filter((uid) => {
        const userAreaIds = targetAreasMap.get(uid) || [];
        return !userAreaIds.some((aid) => gestorAreaIds.includes(aid));
      });

      if (outsideArea.length > 0) {
        return NextResponse.json(
          { error: 'Gestores só podem notificar usuários da própria área' },
          { status: 403 }
        );
      }
    }

    // Criar notificações para cada usuário
    const notifications = validatedData.userIds.map((userId) => ({
      user_id: userId,
      type: validatedData.type,
      message: validatedData.message,
      read: false,
    }));

    // Usar admin client para inserir notificações destinadas a outros usuários (bypass RLS)
    const admin = createAdminClient();
    const { error: insertError } = await admin
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Erro ao criar notificações:', insertError);
      return NextResponse.json(
        { error: 'Erro ao criar notificações' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: notifications.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET — buscar notificações do usuário autenticado
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH — marcar notificação(ões) como lida(s)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const admin = createAdminClient();
    const { id, markAll } = await request.json();

    if (markAll) {
      const { error } = await admin
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (id) {
      const { error } = await admin
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar notificação:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
