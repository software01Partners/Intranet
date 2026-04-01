import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Busca os user_ids de trail_users e retorna um mapa trail_id -> user_ids[]
 */
export async function getTrailUsersMap(
  supabase: SupabaseClient,
  trailIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (trailIds.length === 0) return map;

  const { data } = await supabase
    .from('trail_users')
    .select('trail_id, user_id')
    .in('trail_id', trailIds);

  if (data) {
    data.forEach((row) => {
      const existing = map.get(row.trail_id) || [];
      existing.push(row.user_id);
      map.set(row.trail_id, existing);
    });
  }

  return map;
}

/**
 * Busca todos os trail_ids atribuídos individualmente a um usuário
 */
export async function getUserTrailIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('trail_users')
    .select('trail_id')
    .eq('user_id', userId);

  return (data || []).map((row) => row.trail_id);
}
