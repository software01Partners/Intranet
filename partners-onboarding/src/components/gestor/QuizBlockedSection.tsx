import { createClient } from '@/lib/supabase/server';
import { QuizBlockedTable } from './QuizBlockedTable';
import type { QuizBlockedItem } from './QuizBlockedTable';

interface QuizBlockedSectionProps {
  areaId: string | null;
}

const LOCKOUT_HOURS = 72;

export async function QuizBlockedSection({ areaId }: QuizBlockedSectionProps) {
  const supabase = await createClient();

  // Buscar todos os usuários (filtrado por área se necessário)
  let usersQuery = supabase
    .from('users')
    .select('id, name, area_id');

  if (areaId) {
    usersQuery = usersQuery.eq('area_id', areaId);
  }

  const { data: users } = await usersQuery;
  if (!users || users.length === 0) {
    return null;
  }

  const userIds = users.map((u) => u.id);

  // Buscar tentativas falhas
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('user_id, module_id, score, total, percentage, passed, attempt_number, cycle, created_at')
    .in('user_id', userIds)
    .eq('passed', false)
    .order('created_at', { ascending: false });

  if (!attempts || attempts.length === 0) {
    return null;
  }

  // Agrupar por user_id + module_id
  const groupedMap = new Map<string, typeof attempts>();
  attempts.forEach((a) => {
    const key = `${a.user_id}:${a.module_id}`;
    const existing = groupedMap.get(key) || [];
    existing.push(a);
    groupedMap.set(key, existing);
  });

  const now = new Date();
  const blockedItems: QuizBlockedItem[] = [];

  for (const [key, groupAttempts] of groupedMap) {
    const latestCycle = groupAttempts[0].cycle;
    const cycleAttempts = groupAttempts.filter((a) => a.cycle === latestCycle);

    if (cycleAttempts.length < 3) continue;

    const latestAttempt = cycleAttempts[0];
    const blockedUntil = new Date(
      new Date(latestAttempt.created_at).getTime() + LOCKOUT_HOURS * 60 * 60 * 1000
    );

    if (blockedUntil <= now) continue;

    const [userId, moduleId] = key.split(':');
    const user = users.find((u) => u.id === userId);

    blockedItems.push({
      userId,
      userName: user?.name || 'Desconhecido',
      moduleId,
      moduleName: '',
      trailName: '',
      totalAttempts: groupAttempts.length,
      lastScore: Math.round(Number(latestAttempt.percentage)),
      blockedUntil: blockedUntil.toISOString(),
    });
  }

  if (blockedItems.length === 0) {
    return null;
  }

  // Buscar nomes dos módulos e trilhas
  const moduleIds = [...new Set(blockedItems.map((b) => b.moduleId))];
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, trail_id')
    .in('id', moduleIds);

  const trailIds = [...new Set((modules || []).map((m) => m.trail_id))];
  const { data: trails } = await supabase
    .from('trails')
    .select('id, name')
    .in('id', trailIds);

  blockedItems.forEach((item) => {
    const mod = modules?.find((m) => m.id === item.moduleId);
    item.moduleName = mod?.title || 'Desconhecido';
    const trail = trails?.find((t) => t.id === mod?.trail_id);
    item.trailName = trail?.name || 'Desconhecida';
  });

  // Ordenar por blockedUntil DESC
  blockedItems.sort((a, b) => new Date(b.blockedUntil).getTime() - new Date(a.blockedUntil).getTime());

  return <QuizBlockedTable items={blockedItems} />;
}
