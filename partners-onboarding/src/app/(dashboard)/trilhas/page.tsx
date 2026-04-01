import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { User, Trail } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { TrailCatalogClient } from './TrailCatalogClient';
import { Card } from '@/components/ui/Card';
import { getTrailAreasMap } from '@/lib/trail-areas';

interface TrailWithProgress extends Trail {
  totalModules: number;
  progress: number;
  areaName?: string | null;
}

// Função para buscar dados do usuário
async function getUserData(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as User;
}

// Função para buscar trilhas visíveis com progresso
async function getTrailsWithProgress(
  userId: string,
  areaId: string | null
): Promise<TrailWithProgress[]> {
  const supabase = await createClient();

  // O RLS já filtra automaticamente as trilhas visíveis, então buscamos todas
  const { data: trailsData, error: trailsError } = await supabase
    .from('trails')
    .select('*')
    .order('sort_order', { ascending: true });

  if (trailsError || !trailsData || trailsData.length === 0) {
    return [];
  }

  // Buscar trail_areas para determinar áreas de cada trilha
  const trailAreasMap = await getTrailAreasMap(supabase, trailsData.map((t) => t.id));

  // Coletar todos os area_ids usados
  const allAreaIds = new Set<string>();
  trailAreasMap.forEach((areaIds) => {
    areaIds.forEach((id) => allAreaIds.add(id));
  });

  const areasMap = new Map<string, string>();
  if (allAreaIds.size > 0) {
    const { data: areasData } = await supabase
      .from('areas')
      .select('id, name')
      .in('id', Array.from(allAreaIds));

    if (areasData) {
      areasData.forEach((area) => {
        areasMap.set(area.id, area.name);
      });
    }
  }

  const trailIds = trailsData.map((t) => t.id);

  // Buscar módulos de cada trilha
  const { data: modulesData } = await supabase
    .from('modules')
    .select('id, trail_id')
    .in('trail_id', trailIds);

  if (!modulesData) {
    return trailsData.map((trail) => ({
      ...(trail as Trail),
      totalModules: 0,
      progress: 0,
      areaName: (trailAreasMap.get(trail.id) || []).map((aid) => areasMap.get(aid)).filter(Boolean).join(', ') || null,
    }));
  }

  // Buscar progresso do usuário
  const { data: userProgressData } = await supabase
    .from('user_progress')
    .select('module_id, completed')
    .eq('user_id', userId)
    .in(
      'module_id',
      modulesData.map((m) => m.id)
    );

  // Calcular progresso para cada trilha
  const trailsWithProgress: TrailWithProgress[] = trailsData.map((trail) => {
    const trailModules = modulesData.filter((m) => m.trail_id === trail.id);
    const totalModules = trailModules.length;

    const completedModules = trailModules.filter((module) => {
      const progress = userProgressData?.find(
        (up) => up.module_id === module.id
      );
      return progress?.completed;
    }).length;

    const progress =
      totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    return {
      ...(trail as Trail),
      totalModules,
      progress,
      areaName: (trailAreasMap.get(trail.id) || []).map((aid) => areasMap.get(aid)).filter(Boolean).join(', ') || null,
    };
  });

  return trailsWithProgress;
}

// Componente Server para buscar dados
async function TrailsData() {
  const user = await getUserData();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#7A7468] dark:text-[#9A9590]">Erro ao carregar dados do usuário.</p>
      </div>
    );
  }

  const trails = await getTrailsWithProgress(user.id, user.area_id);

  return <TrailCatalogClient trails={trails} />;
}

// Skeleton para loading
function TrailsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="h-full">
          <Skeleton className="h-6 w-3/4 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3 mb-4" />
          <Skeleton className="h-2 w-full mb-4" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ))}
    </div>
  );
}

// Componente principal da página
export default async function TrailsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#2D2A26] dark:text-[#E8E5E0] mb-1">
          Trilhas de Conhecimento
        </h1>
        <Suspense fallback={<Skeleton className="h-5 w-48" />}>
          <TrailsCount />
        </Suspense>
      </div>

      {/* Grid de trilhas */}
      <Suspense fallback={<TrailsSkeleton />}>
        <TrailsData />
      </Suspense>
    </div>
  );
}

// Componente para mostrar contagem
async function TrailsCount() {
  const user = await getUserData();
  if (!user) return null;

  const trails = await getTrailsWithProgress(user.id, user.area_id);
  return (
    <p className="text-[#7A7468] dark:text-[#9A9590]">
      {trails.length} {trails.length === 1 ? 'trilha disponível' : 'trilhas disponíveis'}
    </p>
  );
}
