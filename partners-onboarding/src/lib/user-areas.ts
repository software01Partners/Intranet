import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Busca os area_ids de user_areas e retorna um mapa user_id -> area_ids[]
 */
export async function getUserAreasMap(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (userIds.length === 0) return map;

  const { data } = await supabase
    .from('user_areas')
    .select('user_id, area_id')
    .in('user_id', userIds);

  if (data) {
    data.forEach((row) => {
      const existing = map.get(row.user_id) || [];
      existing.push(row.area_id);
      map.set(row.user_id, existing);
    });
  }

  return map;
}

/**
 * Busca todos os user_ids que pertencem a determinadas áreas
 */
export async function getUserIdsByAreas(
  supabase: SupabaseClient,
  areaIds: string[]
): Promise<string[]> {
  if (areaIds.length === 0) return [];

  const { data } = await supabase
    .from('user_areas')
    .select('user_id')
    .in('area_id', areaIds);

  return [...new Set((data || []).map((row) => row.user_id))];
}
