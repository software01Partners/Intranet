import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { User, Area } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Users, Award, AlertTriangle } from 'lucide-react';
import { calculateProgress } from '@/lib/utils';
import { getTrailAreasMap, isTrailVisibleToUser } from '@/lib/trail-areas';
import { getTrailUsersMap } from '@/lib/trail-users';
import { getUserAreasMap } from '@/lib/user-areas';
import { createAdminClient } from '@/lib/supabase/admin';
import { TeamTable } from '@/components/gestor/TeamTable';
import { TeamStats } from '@/components/gestor/TeamStats';
import { TeamCharts } from '@/components/gestor/TeamCharts';
import { AlertsSection } from '@/components/gestor/AlertsSection';
import { AreaSelector } from '@/components/gestor/AreaSelector';
import { QuizBlockedSection } from '@/components/gestor/QuizBlockedSection';

// Tipos para dados da equipe
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  overallProgress: number;
  trailsCompleted: number;
  totalTrails: number;
  lastModuleCompletedAt: string | null;
  status: 'em_dia' | 'regular' | 'atrasado';
}

export interface TeamStatsData {
  totalMembers: number;
  averageProgress: number;
  trailsCompleted: number;
  delayedMembers: number;
}

export interface TrailProgressData {
  trailId: string;
  trailName: string;
  averageProgress: number;
  trailType: 'obrigatoria_global' | 'obrigatoria_area' | 'optativa_global' | 'optativa_area';
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

// Função para buscar todas as áreas (para admin)
async function getAllAreas(): Promise<Area[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .order('name', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as Area[];
}

// Função para buscar membros da equipe (exportada para uso em componentes)
export async function getTeamMembers(areaIds: string[]): Promise<TeamMember[]> {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Buscar colaboradores da área(s)
  let query = supabase
    .from('users')
    .select('id, name, email, avatar_url, area_id')
    .eq('role', 'colaborador');

  if (areaIds.length > 0) {
    // Buscar user_ids que pertencem a qualquer dessas áreas via user_areas
    const { data: userAreaRows } = await adminClient
      .from('user_areas')
      .select('user_id')
      .in('area_id', areaIds);
    const userIdsInAreas = [...new Set((userAreaRows || []).map((r) => r.user_id))];
    if (userIdsInAreas.length === 0) return [];
    query = query.in('id', userIdsInAreas);
  }

  const { data: members, error } = await query;

  if (error || !members || members.length === 0) {
    return [];
  }

  const memberIds = members.map((m) => m.id);

  // Buscar todas as trilhas visíveis para calcular progresso
  const { data: allTrails } = await supabase
    .from('trails')
    .select('id, name, type, area_id');

  if (!allTrails || allTrails.length === 0) {
    return members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      avatar_url: member.avatar_url,
      overallProgress: 0,
      trailsCompleted: 0,
      totalTrails: 0,
      lastModuleCompletedAt: null,
      status: 'atrasado' as const,
    }));
  }

  // Buscar trail_areas, trail_users e user_areas
  const allTrailIds = allTrails.map((t) => t.id);
  const [trailAreasMap, trailUsersMap, memberAreasMap] = await Promise.all([
    getTrailAreasMap(supabase, allTrailIds),
    getTrailUsersMap(supabase, allTrailIds),
    getUserAreasMap(adminClient, memberIds),
  ]);

  // Filtrar trilhas visíveis para cada membro (baseado nas áreas dele + trail_users)
  const visibleTrailsByMember = new Map<string, string[]>();
  members.forEach((member) => {
    const memberAreaIds = memberAreasMap.get(member.id) || (member.area_id ? [member.area_id] : []);
    const visible = allTrails.filter((trail) =>
      isTrailVisibleToUser(trail, memberAreaIds, trailAreasMap.get(trail.id) || [], trailUsersMap.get(trail.id) || [], member.id)
    );
    visibleTrailsByMember.set(member.id, visible.map((t) => t.id));
  });

  // Buscar todos os módulos
  const { data: allModules } = await supabase
    .from('modules')
    .select('id, trail_id');

  if (!allModules) {
    return members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      avatar_url: member.avatar_url,
      overallProgress: 0,
      trailsCompleted: 0,
      totalTrails: 0,
      lastModuleCompletedAt: null,
      status: 'atrasado' as const,
    }));
  }

  // Buscar progresso de todos os membros
  const { data: allProgress } = await supabase
    .from('user_progress')
    .select('user_id, module_id, completed, completed_at')
    .in('user_id', memberIds);

  // Calcular estatísticas para cada membro
  const teamMembers: TeamMember[] = members.map((member) => {
    const visibleTrailIds = visibleTrailsByMember.get(member.id) || [];
    const memberModules = allModules.filter((m) =>
      visibleTrailIds.includes(m.trail_id)
    );
    const memberProgress =
      allProgress?.filter((p) => p.user_id === member.id) || [];

    const completedModules = memberModules.filter((module) => {
      const progress = memberProgress.find((p) => p.module_id === module.id);
      return progress?.completed;
    });

    const overallProgress = calculateProgress(
      completedModules.length,
      memberModules.length
    );

    // Calcular trilhas concluídas (100% de progresso)
    const trailsProgress = new Map<string, { total: number; completed: number }>();
    memberModules.forEach((module) => {
      const trailId = module.trail_id;
      const current = trailsProgress.get(trailId) || { total: 0, completed: 0 };
      current.total++;
      const progress = memberProgress.find((p) => p.module_id === module.id);
      if (progress?.completed) {
        current.completed++;
      }
      trailsProgress.set(trailId, current);
    });

    let trailsCompleted = 0;
    trailsProgress.forEach((progress) => {
      if (progress.total > 0 && progress.completed === progress.total) {
        trailsCompleted++;
      }
    });

    // Último módulo concluído
    const completedProgress = memberProgress
      .filter((p) => p.completed && p.completed_at)
      .sort(
        (a, b) =>
          new Date(b.completed_at!).getTime() -
          new Date(a.completed_at!).getTime()
      );
    const lastModuleCompletedAt =
      completedProgress.length > 0 ? completedProgress[0].completed_at : null;

    // Status baseado no progresso
    let status: 'em_dia' | 'regular' | 'atrasado';
    if (overallProgress >= 70) {
      status = 'em_dia';
    } else if (overallProgress >= 30) {
      status = 'regular';
    } else {
      status = 'atrasado';
    }

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      avatar_url: member.avatar_url,
      overallProgress,
      trailsCompleted,
      totalTrails: visibleTrailIds.length,
      lastModuleCompletedAt,
      status,
    };
  });

  return teamMembers;
}

// Função para calcular estatísticas da equipe (exportada para uso em componentes)
export async function getTeamStats(
  areaIds: string[]
): Promise<TeamStatsData> {
  const members = await getTeamMembers(areaIds);

  if (members.length === 0) {
    return {
      totalMembers: 0,
      averageProgress: 0,
      trailsCompleted: 0,
      delayedMembers: 0,
    };
  }

  const totalMembers = members.length;
  const averageProgress =
    members.reduce((sum, m) => sum + m.overallProgress, 0) / totalMembers;
  const trailsCompleted = members.reduce(
    (sum, m) => sum + m.trailsCompleted,
    0
  );
  const delayedMembers = members.filter((m) => m.status === 'atrasado').length;

  return {
    totalMembers,
    averageProgress: Math.round(averageProgress),
    trailsCompleted,
    delayedMembers,
  };
}

// Função para calcular progresso médio por trilha (exportada para uso em componentes)
export async function getTrailProgressData(
  areaIds: string[]
): Promise<TrailProgressData[]> {
  const supabase = await createClient();
  const members = await getTeamMembers(areaIds);

  if (members.length === 0) {
    return [];
  }

  const memberIds = members.map((m) => m.id);

  // Buscar todas as trilhas visíveis
  const { data: allTrails } = await supabase
    .from('trails')
    .select('id, name, type, area_id');

  if (!allTrails || allTrails.length === 0) {
    return [];
  }

  // Buscar trail_areas e trail_users
  const allTrailIds = allTrails.map((t) => t.id);
  const [trailAreasMapProgress, trailUsersMapProgress] = await Promise.all([
    getTrailAreasMap(supabase, allTrailIds),
    getTrailUsersMap(supabase, allTrailIds),
  ]);

  // Filtrar trilhas visíveis para as áreas (ou todas se sem filtro)
  const visibleTrails = allTrails.filter((trail) => {
    if (areaIds.length > 0) {
      return isTrailVisibleToUser(trail, areaIds, trailAreasMapProgress.get(trail.id) || [], trailUsersMapProgress.get(trail.id) || []);
    }
    return true; // Admin vê todas
  });

  // Buscar módulos
  const trailIds = visibleTrails.map((t) => t.id);
  const { data: allModules } = await supabase
    .from('modules')
    .select('id, trail_id')
    .in('trail_id', trailIds);

  if (!allModules) {
    return [];
  }

  // Buscar progresso
  const { data: allProgress } = await supabase
    .from('user_progress')
    .select('user_id, module_id, completed')
    .in('user_id', memberIds);

  // Calcular progresso médio por trilha
  const trailProgressData: TrailProgressData[] = visibleTrails.map((trail) => {
    const trailModules = allModules.filter((m) => m.trail_id === trail.id);
    const trailProgresses: number[] = [];

    members.forEach((member) => {
      const memberModules = trailModules;
      const memberProgress =
        allProgress?.filter((p) => p.user_id === member.id) || [];

      const completedModules = memberModules.filter((module) => {
        const progress = memberProgress.find((p) => p.module_id === module.id);
        return progress?.completed;
      });

      const progress = calculateProgress(
        completedModules.length,
        memberModules.length
      );
      trailProgresses.push(progress);
    });

    const averageProgress =
      trailProgresses.length > 0
        ? trailProgresses.reduce((sum, p) => sum + p, 0) / trailProgresses.length
        : 0;

    return {
      trailId: trail.id,
      trailName: trail.name,
      averageProgress: Math.round(averageProgress),
      trailType: trail.type,
    };
  });

  return trailProgressData;
}

// Componente Skeleton para Stats
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Componente principal
export default async function GestorPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const [user, { area }] = await Promise.all([getUserData(), searchParams]);

  if (!user) {
    redirect('/login');
  }

  // Verificar role
  if (user.role !== 'gestor' && user.role !== 'admin') {
    redirect('/');
  }

  // Determinar áreas a visualizar
  let selectedAreaIds: string[] = [];
  if (user.role === 'gestor') {
    // Buscar todas as áreas do gestor via user_areas
    const adminClient = createAdminClient();
    const gestorAreasMap = await getUserAreasMap(adminClient, [user.id]);
    selectedAreaIds = gestorAreasMap.get(user.id) || (user.area_id ? [user.area_id] : []);
  } else if (user.role === 'admin' && area) {
    selectedAreaIds = area === 'all' ? [] : [area];
  }

  // Para compatibilidade com AreaSelector (que usa string | null)
  const selectedAreaId: string | null = selectedAreaIds.length === 1 ? selectedAreaIds[0] : (selectedAreaIds.length === 0 ? null : selectedAreaIds[0]);

  // Buscar áreas para o seletor (apenas admin)
  const areas = user.role === 'admin' ? await getAllAreas() : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#2D2A26] dark:text-[#E8E5E0] mb-1">
          Painel do Gestor
        </h1>
        <p className="text-[#7A7468] dark:text-[#9A9590]">
          Visão geral da equipe e progresso dos colaboradores
        </p>
      </div>

      {/* Seletor de área (apenas admin) */}
      {user.role === 'admin' && (
        <Suspense fallback={<Skeleton className="h-16 w-full max-w-xs" />}>
          <AreaSelector areas={areas} selectedAreaId={selectedAreaId} />
        </Suspense>
      )}

      {/* Stats Cards */}
      <Suspense fallback={<StatsSkeleton />}>
        <TeamStats areaIds={selectedAreaIds} />
      </Suspense>

      {/* Tabela da Equipe */}
      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <TeamTable areaIds={selectedAreaIds} />
          </Suspense>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <TeamCharts areaIds={selectedAreaIds} />
      </Suspense>

      {/* Alertas de Atraso */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AlertsSection areaIds={selectedAreaIds} />
      </Suspense>

      {/* Quizzes Bloqueados */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <QuizBlockedSection areaIds={selectedAreaIds} />
      </Suspense>
    </div>
  );
}
