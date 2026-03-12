import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const checkQuizSchema = z.object({
  moduleId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOption: z.number().int().min(0),
    })
  ),
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
    const { moduleId, answers } = checkQuizSchema.parse(body);

    // Verificar se o módulo existe e é do tipo quiz
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id, type')
      .eq('id', moduleId)
      .eq('type', 'quiz')
      .single();

    if (moduleError || !module) {
      return NextResponse.json(
        { error: 'Módulo não encontrado ou não é um quiz' },
        { status: 404 }
      );
    }

    // Verificar tentativas anteriores
    const { data: existingProgress, error: progressError } = await supabase
      .from('user_progress')
      .select('completed, score')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Erro ao buscar progresso:', progressError);
    }

    // Se já completou, não pode tentar novamente
    if (existingProgress?.completed) {
      return NextResponse.json(
        { error: 'Você já completou este quiz' },
        { status: 400 }
      );
    }

    // Contar tentativas anteriores
    // Como não temos uma tabela de tentativas, vamos usar uma lógica simplificada:
    // Vamos contar tentativas baseado em quantas vezes o score foi salvo
    // Como temos UNIQUE(user_id, module_id), vamos usar uma abordagem diferente:
    // Vamos criar uma tabela quiz_attempts para rastrear cada tentativa (se não existir, usar lógica alternativa)
    
    let attemptCount = 0;
    
    // Tentar buscar tentativas da tabela quiz_attempts (se existir)
    const { data: attempts, count: attemptsCount, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('module_id', moduleId);

    if (!attemptsError && attemptsCount !== null) {
      attemptCount = attemptsCount;
    } else if (existingProgress?.score !== null && !existingProgress.completed) {
      // Se a tabela não existir, usar lógica alternativa:
      // Se já existe um registro com score não-nulo e completed: false, já tentou antes
      // Como não temos histórico exato, vamos assumir que já tentou pelo menos 1 vez
      // e permitir até 3 tentativas totais
      attemptCount = 1;
    }

    // Verificar limite de 3 tentativas
    if (attemptCount >= 3) {
      return NextResponse.json(
        { error: 'Limite de tentativas atingido. Você já tentou 3 vezes.' },
        { status: 400 }
      );
    }

    // Registrar esta tentativa (se a tabela quiz_attempts existir)
    const { error: insertAttemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        module_id: moduleId,
        score: null,
        created_at: new Date().toISOString(),
      });

    // Se a tabela não existir, ignorar o erro (a tentativa será contada de forma simplificada)
    if (insertAttemptError && insertAttemptError.code !== '42P01') {
      // 42P01 = relation does not exist (tabela não existe)
      console.warn('Tabela quiz_attempts não existe, usando lógica simplificada');
    }

    // Buscar questões com correct_answer (server-side apenas)
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

    // Comparar respostas
    let correctCount = 0;
    const feedback: Array<{
      questionId: string;
      correct: boolean;
      correctAnswer: number;
      selectedAnswer: number | null;
    }> = [];

    questions.forEach((question) => {
      const userAnswer = answers.find((a) => a.questionId === question.id);
      const selectedOption = userAnswer?.selectedOption ?? null;
      const isCorrect = selectedOption === question.correct_answer;

      if (isCorrect) {
        correctCount++;
      }

      feedback.push({
        questionId: question.id,
        correct: isCorrect,
        correctAnswer: question.correct_answer,
        selectedAnswer: selectedOption,
      });
    });

    // Calcular score
    const total = questions.length;
    const score = correctCount;
    const percentage = (score / total) * 100;
    const minimumScore = 70;
    const passed = percentage >= minimumScore;

    // Salvar progresso
    const progressData: {
      user_id: string;
      module_id: string;
      completed: boolean;
      score: number;
      completed_at?: string;
    } = {
      user_id: user.id,
      module_id: moduleId,
      completed: passed,
      score: percentage,
    };

    if (passed) {
      progressData.completed_at = new Date().toISOString();
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

    // Atualizar score na tentativa (se a tabela quiz_attempts existir)
    try {
      // Buscar a tentativa mais recente (criada antes da correção)
      const { data: latestAttempt } = await supabase
        .from('quiz_attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .is('score', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestAttempt) {
        await supabase
          .from('quiz_attempts')
          .update({ score: percentage })
          .eq('id', latestAttempt.id);
      }
    } catch (error) {
      // Se a tabela não existir, ignorar o erro
    }

    // Se passou, verificar se a trilha foi concluída e criar notificações
    let isTrailComplete = false;
    let trailIdForCertificate: string | undefined = undefined;

    if (passed) {
      // Buscar trilha do módulo
      const { data: moduleWithTrail } = await supabase
        .from('modules')
        .select('trail_id')
        .eq('id', moduleId)
        .single();

      if (moduleWithTrail) {
        trailIdForCertificate = moduleWithTrail.trail_id;

        // Verificar se todos os módulos da trilha foram concluídos
        const { data: allModules } = await supabase
          .from('modules')
          .select('id')
          .eq('trail_id', moduleWithTrail.trail_id);

        if (allModules && allModules.length > 0) {
          const moduleIds = allModules.map((m) => m.id);

          const { data: completedProgress } = await supabase
            .from('user_progress')
            .select('module_id')
            .eq('user_id', user.id)
            .eq('completed', true)
            .in('module_id', moduleIds);

          const completedCount = completedProgress?.length || 0;
          isTrailComplete = completedCount === allModules.length;

          // Se a trilha foi concluída, criar notificações (certificado será gerado sob demanda)
          if (isTrailComplete) {
            // Buscar dados da trilha e do usuário
            const { data: trail } = await supabase
              .from('trails')
              .select('name')
              .eq('id', moduleWithTrail.trail_id)
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
              .eq('trail_id', moduleWithTrail.trail_id)
              .single();

            // Criar certificado apenas se não existir (sem PDF ainda, será gerado sob demanda)
            if (!existingCertificate) {
              await supabase.from('certificates').insert({
                user_id: user.id,
                trail_id: moduleWithTrail.trail_id,
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
        }
      }
    }

    return NextResponse.json({
      score,
      total,
      percentage,
      passed,
      minimumScore,
      feedback,
      trailComplete: isTrailComplete,
      trailId: trailIdForCertificate,
    });
  } catch (error) {
    console.error('Erro ao corrigir quiz:', error);

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
