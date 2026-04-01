import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    // Gestor só pode notificar usuários da própria área
    if (userData.role === 'gestor' && userData.area_id) {
      const { data: targetUsers } = await supabase
        .from('users')
        .select('id, area_id')
        .in('id', validatedData.userIds);

      const outsideArea = (targetUsers || []).filter(
        (u) => u.area_id !== userData.area_id
      );

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

    const { error: insertError } = await supabase
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
