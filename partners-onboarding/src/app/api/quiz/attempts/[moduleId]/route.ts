import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const LOCKOUT_HOURS = 72;
const MAX_ATTEMPTS_PER_CYCLE = 3;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar tentativas
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false });

    const allAttempts = attempts || [];

    // Verificar se já passou
    const { data: progress } = await supabase
      .from('user_progress')
      .select('completed')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .single();

    const passed = progress?.completed || false;

    if (allAttempts.length === 0) {
      return NextResponse.json({
        attempts: [],
        currentCycle: 1,
        attemptsUsed: 0,
        attemptsRemaining: MAX_ATTEMPTS_PER_CYCLE,
        blockedUntil: null,
        passed,
      });
    }

    const currentCycle = allAttempts[0].cycle;
    const cycleAttempts = allAttempts.filter((a) => a.cycle === currentCycle);
    let attemptsUsed = cycleAttempts.length;
    let blockedUntil: string | null = null;
    let effectiveCycle = currentCycle;

    // Se 3 tentativas no ciclo, verificar lockout
    if (attemptsUsed >= MAX_ATTEMPTS_PER_CYCLE) {
      const latestAttempt = cycleAttempts[0];
      const lockoutEnd = new Date(
        new Date(latestAttempt.created_at).getTime() + LOCKOUT_HOURS * 60 * 60 * 1000
      );

      if (new Date() < lockoutEnd) {
        blockedUntil = lockoutEnd.toISOString();
      } else {
        // Lockout expirou, novo ciclo
        effectiveCycle = currentCycle + 1;
        attemptsUsed = 0;
      }
    }

    return NextResponse.json({
      attempts: allAttempts,
      currentCycle: effectiveCycle,
      attemptsUsed,
      attemptsRemaining: blockedUntil ? 0 : MAX_ATTEMPTS_PER_CYCLE - attemptsUsed,
      blockedUntil,
      passed,
    });
  } catch (error) {
    console.error('Erro ao buscar tentativas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
