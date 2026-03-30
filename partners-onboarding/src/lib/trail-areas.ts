import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Busca os area_ids de trail_areas e retorna um mapa trail_id -> area_ids[]
 */
export async function getTrailAreasMap(
  supabase: SupabaseClient,
  trailIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (trailIds.length === 0) return map;

  const { data } = await supabase
    .from('trail_areas')
    .select('trail_id, area_id')
    .in('trail_id', trailIds);

  if (data) {
    data.forEach((row) => {
      const existing = map.get(row.trail_id) || [];
      existing.push(row.area_id);
      map.set(row.trail_id, existing);
    });
  }

  return map;
}

/**
 * Verifica se uma trilha é visível para um usuário com base na área dele.
 * Usa trail_areas para tipos _area.
 */
export function isTrailVisibleToArea(
  trail: { type: string; area_id?: string | null },
  userAreaId: string | null,
  trailAreaIds: string[]
): boolean {
  if (trail.type === 'obrigatoria_global' || trail.type === 'optativa_global') {
    return true;
  }
  if (trail.type === 'obrigatoria_area' || trail.type === 'optativa_area') {
    if (!userAreaId) return false;
    return trailAreaIds.includes(userAreaId);
  }
  return false;
}
