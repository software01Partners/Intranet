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
 * Verifica se uma trilha é visível para um usuário com base nas áreas dele
 * e atribuição individual.
 *
 * @param trail - a trilha com tipo
 * @param userAreaIds - array de area_ids do usuário (de user_areas)
 * @param trailAreaIds - area_ids da trilha (de trail_areas)
 * @param trailUserIds - user_ids atribuídos individualmente à trilha (de trail_users)
 * @param userId - id do usuário atual
 */
export function isTrailVisibleToUser(
  trail: { type: string },
  userAreaIds: string[],
  trailAreaIds: string[],
  trailUserIds: string[] = [],
  userId?: string
): boolean {
  // Global → todos veem
  if (trail.type === 'obrigatoria_global' || trail.type === 'optativa_global') {
    return true;
  }

  // Por área → vê se qualquer área do usuário está na trilha
  if (trail.type === 'obrigatoria_area' || trail.type === 'optativa_area') {
    const hasAreaMatch = userAreaIds.some((areaId) => trailAreaIds.includes(areaId));
    if (hasAreaMatch) return true;
  }

  // Atribuição individual → vê se o usuário está na lista
  if (userId && trailUserIds.includes(userId)) {
    return true;
  }

  return false;
}

/**
 * @deprecated Use isTrailVisibleToUser instead
 * Mantida para backward compatibility durante migração
 */
export function isTrailVisibleToArea(
  trail: { type: string; area_id?: string | null },
  userAreaId: string | null,
  trailAreaIds: string[]
): boolean {
  return isTrailVisibleToUser(
    trail,
    userAreaId ? [userAreaId] : [],
    trailAreaIds
  );
}
