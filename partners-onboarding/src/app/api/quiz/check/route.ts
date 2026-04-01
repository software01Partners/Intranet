import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { handleTrailCompletion } from '@/lib/trail-completion';

const checkQuizSchema = z.object({
  moduleId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOption: z.number().int().min(0),
    })
  ),
  time_spent: z.number().int().min(0).optional(),
});

const LOCKOUT_HOURS = 72;
const MAX_ATTEMPTS_PER_CYCLE = 3;
const MINIMUM_SCORE = 80;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { moduleId, answers, time_spent } = checkQuizSchema.parse(body);

    // Verificar se o módulo existe e é do tipo quiz
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('id, type, title, trail_id')
      .eq('id', moduleId)
      .eq('type', 'quiz')
      .single();

    if (moduleError || !moduleData) {
      return NextResponse.json(
        { error: 'Módulo não encontrado ou não é um quiz' },
        { status: 404 }
      );
    }

    // Verificar se o usuário tem acesso à trilha deste módulo
    const adminClient = createAdminClient();

    const { data: trail } = await supabase
      .from('trails')
      .select('id, type, area_id')
      .eq('id', moduleData.trail_id)
      .is('deleted_at', null)
      .single();

    if (!trail) {
      return NextResponse.json(
        { error: 'Trilha não encontrada ou foi excluída' },
        { status: 404 }
      );
    }

    // Verificar visibilidade da trilha com multi-area + trail_users
    if (trail.type === 'obrigatoria_area' || trail.type === 'optativa_area') {
      const [{ data: userAreas }, { data: trailAreas }, { data: trailUsers }] = await Promise.all([
        adminClient.from('user_areas').select('area_id').eq('user_id', user.id),
        adminClient.from('trail_areas').select('area_id').eq('trail_id', trail.id),
        adminClient.from('trail_users').select('user_id').eq('trail_id', trail.id),
      ]);

      const userAreaIds = (userAreas || []).map((ua) => ua.area_id);
      const trailAreaIds = (trailAreas || []).map((ta) => ta.area_id);
      const trailUserIds = (trailUsers || []).map((tu) => tu.user_id);

      const hasAreaMatch = userAreaIds.some((aid) => trailAreaIds.includes(aid));
      const hasUserMatch = trailUserIds.includes(user.id);

      if (!hasAreaMatch && !hasUserMatch) {
        return NextResponse.json(
          { error: 'Você não tem acesso a este quiz' },
          { status: 403 }
        );
      }
    }

    // Verificar se já completou
    const { data: existingProgress, error: progressError } = await supabase
      .from('user_progress')
      .select('completed')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Erro ao buscar progresso:', progressError);
    }

    if (existingProgress?.completed) {
      return NextResponse.json(
        { error: 'Você já completou este quiz' },
        { status: 400 }
      );
    }

    // Buscar tentativas anteriores ordenadas por data
    const { data: previousAttempts } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false });

    const attempts = previousAttempts || [];

    // Determinar ciclo atual e tentativas usadas
    let currentCycle = 1;
    let attemptsInCycle = 0;

    if (attempts.length > 0) {
      currentCycle = attempts[0].cycle;
      attemptsInCycle = attempts.filter((a) => a.cycle === currentCycle).length;

      // Se 3 tentativas no ciclo atual, verificar lockout
      if (attemptsInCycle >= MAX_ATTEMPTS_PER_CYCLE) {
        const latestInCycle = attempts.filter((a) => a.cycle === currentCycle)[0];

        const blockedUntil = new Date(
          new Date(latestInCycle.created_at).getTime() + LOCKOUT_HOURS * 60 * 60 * 1000
        );

        if (new Date() < blockedUntil) {
          return NextResponse.json(
            {
              error: 'Quiz bloqueado. Tente novamente após o período de espera.',
              blocked_until: blockedUntil.toISOString(),
              attemptsUsed: MAX_ATTEMPTS_PER_CYCLE,
              attemptsRemaining: 0,
            },
            { status: 423 }
          );
        }

        // Lockout expirou, novo ciclo
        currentCycle = currentCycle + 1;
        attemptsInCycle = 0;
      }
    }

    const attemptNumber = attemptsInCycle + 1;

    // Buscar questões com correct_answer (server-side)
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, question, options, correct_answer')
      .eq('module_id', moduleId);

    if (questionsError || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Questões não encontradas' },
        { status: 404 }
      );
    }

    // Corrigir respostas
    let correctCount = 0;
    questions.forEach((question) => {
      const userAnswer = answers.find((a) => a.questionId === question.id);
      if (userAnswer && userAnswer.selectedOption === question.correct_answer) {
        correctCount++;
      }
    });

    const total = questions.length;
    const score = correctCount;
    const percentage = (score / total) * 100;
    const passed = percentage >= MINIMUM_SCORE;

    // Inserir tentativa na tabela quiz_attempts
    await supabase.from('quiz_attempts').insert({
      user_id: user.id,
      module_id: moduleId,
      score,
      total,
      percentage,
      passed,
      time_spent: time_spent ?? null,
      attempt_number: attemptNumber,
      cycle: currentCycle,
    });

    // Upsert user_progress
    const progressData: Record<string, unknown> = {
      user_id: user.id,
      module_id: moduleId,
      completed: passed,
      score,
    };

    if (passed) {
      progressData.completed_at = new Date().toISOString();
    }
    if (time_spent != null) {
      progressData.time_spent = time_spent;
    }

    const { error: upsertError } = await supabase
      .from('user_progress')
      .upsert(progressData, {
        onConflict: 'user_id,module_id',
      });

    if (upsertError) {
      console.error('Erro ao salvar progresso:', upsertError);
      return NextResponse.json(
        { error: 'Erro ao salvar progresso' },
        { status: 500 }
      );
    }

    // Calcular bloqueio e tentativas restantes
    const attemptsRemaining = MAX_ATTEMPTS_PER_CYCLE - attemptNumber;
    let blockedUntil: string | null = null;

    // Se falhou na 3ª tentativa, notificar gestor(es)
    if (!passed && attemptNumber === MAX_ATTEMPTS_PER_CYCLE) {
      blockedUntil = new Date(
        Date.now() + LOCKOUT_HOURS * 60 * 60 * 1000
      ).toISOString();

      const { data: failedUserData } = await supabase
        .from('users')
        .select('name, area_id')
        .eq('id', user.id)
        .single();

      const { data: failedTrail } = await supabase
        .from('trails')
        .select('name')
        .eq('id', moduleData.trail_id)
        .single();

      if (failedUserData && failedTrail) {
        // Find gestors who manage any of this user's areas
        const { data: failedUserAreas } = await adminClient
          .from('user_areas')
          .select('area_id')
          .eq('user_id', user.id);

        const failedUserAreaIds = (failedUserAreas || []).map((ua) => ua.area_id);
        if (failedUserAreaIds.length === 0 && failedUserData.area_id) {
          failedUserAreaIds.push(failedUserData.area_id);
        }

        if (failedUserAreaIds.length > 0) {
          // Find gestors in any of those areas via user_areas
          const { data: gestorAreaEntries } = await adminClient
            .from('user_areas')
            .select('user_id')
            .in('area_id', failedUserAreaIds);

          const potentialGestorIds = [...new Set((gestorAreaEntries || []).map((e) => e.user_id))];
          if (potentialGestorIds.length > 0) {
            const { data: gestores } = await adminClient
              .from('users')
              .select('id')
              .in('id', potentialGestorIds)
              .eq('role', 'gestor');

            if (gestores && gestores.length > 0) {
              const notifications = gestores.map((gestor) => ({
                user_id: gestor.id,
                type: 'quiz_bloqueado' as const,
                message: `${failedUserData.name || 'Um colaborador'} falhou 3 vezes no quiz "${moduleData.title}" da trilha "${failedTrail.name}"`,
                read: false,
              }));

              await adminClient.from('notifications').insert(notifications);
            }
          }
        }
      }
    }

    // Se passou, verificar conclusão da trilha
    let isTrailComplete = false;
    let trailIdForCertificate: string | undefined = undefined;

    if (passed) {
      trailIdForCertificate = moduleData.trail_id;
      isTrailComplete = await handleTrailCompletion(supabase, user.id, moduleData.trail_id);
    }

    return NextResponse.json({
      score,
      total,
      percentage,
      passed,
      minimumScore: MINIMUM_SCORE,
      attemptNumber,
      attemptsRemaining,
      blockedUntil,
      cycle: currentCycle,
      trailComplete: isTrailComplete,
      trailId: trailIdForCertificate,
    });
  } catch (error) {
    console.error('Erro ao corrigir quiz:', error);

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
