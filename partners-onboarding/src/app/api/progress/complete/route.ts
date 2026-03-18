import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const completeModuleSchema = z.object({
  module_id: z.string().uuid(),
  time_spent: z.number().int().min(0).optional(),
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

    // Validar body
    const body = await request.json();
    const { module_id, time_spent } = completeModuleSchema.parse(body);

    // Verificar se o módulo existe e se o usuário tem acesso
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id, trail_id')
      .eq('id', module_id)
      .single();

    if (moduleError || !module) {
      return NextResponse.json(
        { error: 'Módulo não encontrado' },
        { status: 404 }
      );
    }

    // Fazer upsert do progresso
    const upsertData: Record<string, unknown> = {
      user_id: user.id,
      module_id,
      completed: true,
      completed_at: new Date().toISOString(),
    };
    if (time_spent != null) {
      upsertData.time_spent = time_spent;
    }

    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .upsert(upsertData, {
        onConflict: 'user_id,module_id',
      })
      .select()
      .single();

    if (progressError) {
      console.error('Erro ao salvar progresso:', progressError);
      return NextResponse.json(
        { error: 'Erro ao salvar progresso' },
        { status: 500 }
      );
    }

    // Verificar se todos os módulos da trilha foram concluídos (buscar TODOS ordenados)
    const { data: allModules } = await supabase
      .from('modules')
      .select('id')
      .eq('trail_id', module.trail_id)
      .order('sort_order', { ascending: true });

    if (!allModules || allModules.length === 0) {
      return NextResponse.json({ success: true, progress });
    }

    const moduleIds = allModules.map((m) => m.id);

    const { data: completedProgress } = await supabase
      .from('user_progress')
      .select('module_id')
      .eq('user_id', user.id)
      .eq('completed', true)
      .in('module_id', moduleIds);

    const completedIds = new Set(
      (completedProgress ?? []).map((p) => p.module_id)
    );
    const completedCount = completedIds.size;
    const isTrailComplete = completedCount === allModules.length;

    // Primeiro módulo ainda não concluído (para avançar automaticamente)
    const nextModuleId = isTrailComplete
      ? undefined
      : allModules.find((m) => !completedIds.has(m.id))?.id;

    // Se a trilha foi concluída, criar notificações (certificado será gerado sob demanda)
    if (isTrailComplete) {
      // Buscar dados da trilha e do usuário
      const { data: trail } = await supabase
        .from('trails')
        .select('name')
        .eq('id', module.trail_id)
        .single();

      const { data: userData } = await supabase
        .from('users')
        .select('area_id, name')
        .eq('id', user.id)
        .single();

      // Verificar se já existe certificado
      const { data: existingCertificate } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', user.id)
        .eq('trail_id', module.trail_id)
        .single();

      // Criar certificado apenas se não existir (sem PDF ainda, será gerado sob demanda)
      if (!existingCertificate) {
        await supabase.from('certificates').insert({
          user_id: user.id,
          trail_id: module.trail_id,
        });
      }

      // Notificar o colaborador sobre o certificado
      if (trail) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'certificado',
          message: `Parabéns! Você concluiu a trilha "${trail.name}" e recebeu seu certificado.`,
          read: false,
        });
      }

      // Notificar o gestor da área (se houver)
      if (userData?.area_id) {
        const { data: gestor } = await supabase
          .from('users')
          .select('id')
          .eq('area_id', userData.area_id)
          .eq('role', 'gestor')
          .single();

        if (gestor && trail) {
          await supabase.from('notifications').insert({
            user_id: gestor.id,
            type: 'nova_trilha', // Reutilizando tipo para notificar gestor
            message: `${userData.name || 'Um colaborador'} concluiu a trilha "${trail.name}".`,
            read: false,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      progress,
      trailComplete: isTrailComplete,
      trailId: isTrailComplete ? module.trail_id : undefined,
      nextModuleId: nextModuleId ?? undefined,
    });
  } catch (error) {
    console.error('Erro ao completar módulo:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
