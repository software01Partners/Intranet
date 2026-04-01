import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { handleTrailCompletion } from '@/lib/trail-completion';

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

    // Verificar se o módulo existe
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

    // Verificar se o usuário tem acesso à trilha deste módulo
    const admin = createAdminClient();

    const { data: trailCheck } = await supabase
      .from('trails')
      .select('id, type')
      .eq('id', module.trail_id)
      .is('deleted_at', null)
      .single();

    if (!trailCheck) {
      return NextResponse.json(
        { error: 'Trilha não encontrada ou foi excluída' },
        { status: 404 }
      );
    }

    if (trailCheck.type === 'obrigatoria_area' || trailCheck.type === 'optativa_area') {
      const [{ data: userAreas }, { data: trailAreas }, { data: trailUsers }] = await Promise.all([
        admin.from('user_areas').select('area_id').eq('user_id', user.id),
        admin.from('trail_areas').select('area_id').eq('trail_id', trailCheck.id),
        admin.from('trail_users').select('user_id').eq('trail_id', trailCheck.id),
      ]);

      const userAreaIds = (userAreas || []).map((ua) => ua.area_id);
      const trailAreaIds = (trailAreas || []).map((ta) => ta.area_id);
      const trailUserIds = (trailUsers || []).map((tu) => tu.user_id);

      const hasAreaMatch = userAreaIds.some((aid) => trailAreaIds.includes(aid));
      const hasUserMatch = trailUserIds.includes(user.id);

      if (!hasAreaMatch && !hasUserMatch) {
        return NextResponse.json(
          { error: 'Você não tem acesso a este módulo' },
          { status: 403 }
        );
      }
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

    // Verificar se todos os módulos da trilha foram concluídos
    const { data: allModules } = await supabase
      .from('modules')
      .select('id')
      .eq('trail_id', module.trail_id)
      .is('deleted_at', null)
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
    const isTrailComplete = completedIds.size === allModules.length;

    // Primeiro módulo ainda não concluído (para avançar automaticamente)
    const nextModuleId = isTrailComplete
      ? undefined
      : allModules.find((m) => !completedIds.has(m.id))?.id;

    // Se a trilha foi concluída, criar certificado e notificar
    if (isTrailComplete) {
      await handleTrailCompletion(supabase, user.id, module.trail_id);
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
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
