import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Verifica se o usuário completou todos os módulos de uma trilha.
 * Se sim, cria certificado e notifica colaborador + gestor(es).
 * Retorna true se a trilha foi concluída.
 */
export async function handleTrailCompletion(
  supabase: SupabaseClient,
  userId: string,
  trailId: string
): Promise<boolean> {
  // Buscar todos os módulos da trilha
  const { data: allModules } = await supabase
    .from('modules')
    .select('id')
    .eq('trail_id', trailId)
    .is('deleted_at', null);

  if (!allModules || allModules.length === 0) return false;

  const moduleIds = allModules.map((m) => m.id);

  // Buscar progresso completo
  const { data: completedProgress } = await supabase
    .from('user_progress')
    .select('module_id')
    .eq('user_id', userId)
    .eq('completed', true)
    .in('module_id', moduleIds);

  const completedCount = completedProgress?.length || 0;
  const isComplete = completedCount === allModules.length;

  if (!isComplete) return false;

  // Buscar dados da trilha e do usuário
  const [{ data: trail }, { data: userData }] = await Promise.all([
    supabase.from('trails').select('name').eq('id', trailId).single(),
    supabase.from('users').select('area_id, name').eq('id', userId).single(),
  ]);

  // Criar certificado se não existir
  const { data: existingCertificate } = await supabase
    .from('certificates')
    .select('id')
    .eq('user_id', userId)
    .eq('trail_id', trailId)
    .single();

  if (!existingCertificate) {
    await supabase.from('certificates').insert({
      user_id: userId,
      trail_id: trailId,
    });
  }

  // Notificar colaborador
  if (trail) {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'certificado',
      message: `Parabéns! Você concluiu a trilha "${trail.name}" e recebeu seu certificado.`,
      read: false,
    });
  }

  // Notificar gestor(es) da área
  if (userData?.area_id && trail) {
    const { data: gestores } = await supabase
      .from('users')
      .select('id')
      .eq('area_id', userData.area_id)
      .eq('role', 'gestor');

    if (gestores && gestores.length > 0) {
      const notifications = gestores.map((gestor) => ({
        user_id: gestor.id,
        type: 'certificado' as const,
        message: `${userData.name || 'Um colaborador'} concluiu a trilha "${trail.name}".`,
        read: false,
      }));
      await supabase.from('notifications').insert(notifications);
    }
  }

  return true;
}
