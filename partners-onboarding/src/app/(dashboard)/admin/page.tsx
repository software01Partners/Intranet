import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { User, Area } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Skeleton } from '@/components/ui/Skeleton';
import { calculateProgress } from '@/lib/utils';
import { getTrailAreasMap, isTrailVisibleToUser } from '@/lib/trail-areas';
import { getTrailUsersMap } from '@/lib/trail-users';
import { getUserAreasMap } from '@/lib/user-areas';
import { createAdminClient } from '@/lib/supabase/admin';
import { MetricsDashboardClient } from '@/components/metrics/MetricsDashboardClient';
import { MetricsAreaSelector } from '@/components/metrics/MetricsAreaSelector';
import type {
  MetricsData,
  KPIData,
  StatusDistributionItem,
  AreaComparisonItem,
  TrailAnalyticsItem,
  UserRankingItem,
  TimelinePoint,
  DeadlineItem,
  ContentAnalyticsData,
} from '@/lib/metrics';
import {
  Users,
  UserCheck,
  TrendingUp,
  Award,
  GraduationCap,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { QuizBlockedSection } from '@/components/gestor/QuizBlockedSection';

// ============================================
// Data Fetching
// ============================================

async function getUserData(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  return (data as User) || null;
}

async function getAllAreas(): Promise<Area[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('areas')
    .select('*')
    .order('name', { ascending: true });

  return (data as Area[]) || [];
}

async function getMetricsData(
  areaIds: string[],
  isAdmin: boolean
): Promise<MetricsData> {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Queries paralelas
  const [
    usersRes,
    trailsRes,
    modulesRes,
    progressRes,
    certificatesRes,
    areasRes,
    quizAttemptsRes,
  ] = await Promise.all([
    supabase.from('users').select('*'),
    supabase.from('trails').select('*'),
    supabase.from('modules').select('*'),
    supabase.from('user_progress').select('*'),
    supabase.from('certificates').select('*'),
    supabase.from('areas').select('*'),
    supabase.from('quiz_attempts').select('user_id, module_id, cycle, passed, created_at').eq('passed', false),
  ]);


  // Todos os usuários participam das métricas
  const users = usersRes.data || [];
  const trails = trailsRes.data || [];
  const modules = modulesRes.data || [];
  const progress = progressRes.data || [];
  const certificates = certificatesRes.data || [];
  const areas = areasRes.data || [];

  // Buscar trail_areas e trail_users para todas as trilhas
  const allTrailIds = trails.map((t) => t.id);
  const [trailAreasMap, trailUsersMap] = await Promise.all([
    getTrailAreasMap(supabase, allTrailIds),
    getTrailUsersMap(supabase, allTrailIds),
  ]);

  // Buscar user_areas para todos os usuários
  const allUserIds = users.map((u) => u.id);
  const userAreasMap = await getUserAreasMap(adminClient, allUserIds);

  // Filtrar por área se necessário
  const filteredUsers = areaIds.length > 0
    ? users.filter((u) => {
        const uAreaIds = userAreasMap.get(u.id) || (u.area_id ? [u.area_id] : []);
        return uAreaIds.some((aid: string) => areaIds.includes(aid));
      })
    : users;

  // ── Helper: trilhas visíveis para um usuário ──
  function getVisibleTrails(userId: string, userAreaId: string | null) {
    const uAreaIds = userAreasMap.get(userId) || (userAreaId ? [userAreaId] : []);
    return trails.filter((t) =>
      isTrailVisibleToUser(t, uAreaIds, trailAreasMap.get(t.id) || [], trailUsersMap.get(t.id) || [], userId)
    );
  }

  // ── Helper: módulos de uma trilha ──
  function getTrailModules(trailId: string) {
    return modules.filter((m) => m.trail_id === trailId);
  }

  // ── Computar progresso por usuário ──
  interface UserMetrics {
    userId: string;
    userName: string;
    email: string;
    avatarUrl: string | null;
    areaId: string | null;
    areaName: string;
    overallProgress: number;
    trailsCompleted: number;
    totalTrails: number;
    lastActivity: string | null;
    status: 'em_dia' | 'regular' | 'atrasado';
  }

  const userMetrics: UserMetrics[] = filteredUsers.map((user) => {
    const visible = getVisibleTrails(user.id, user.area_id);
    const visibleModules = visible.flatMap((t) => getTrailModules(t.id));
    const userProgress = progress.filter((p) => p.user_id === user.id);

    const completedModuleIds = new Set(
      userProgress.filter((p) => p.completed).map((p) => p.module_id)
    );

    const completedCount = visibleModules.filter((m) =>
      completedModuleIds.has(m.id)
    ).length;
    const overallProgress = calculateProgress(completedCount, visibleModules.length);

    // Trilhas concluídas
    let trailsCompleted = 0;
    visible.forEach((trail) => {
      const trailMods = getTrailModules(trail.id);
      if (trailMods.length > 0 && trailMods.every((m) => completedModuleIds.has(m.id))) {
        trailsCompleted++;
      }
    });

    // Última atividade
    const completedDates = userProgress
      .filter((p) => p.completed && p.completed_at)
      .map((p) => p.completed_at!);
    const lastActivity =
      completedDates.length > 0
        ? completedDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        : null;

    const status: 'em_dia' | 'regular' | 'atrasado' =
      overallProgress >= 70 ? 'em_dia' : overallProgress >= 30 ? 'regular' : 'atrasado';

    const area = areas.find((a) => a.id === user.area_id);

    return {
      userId: user.id,
      userName: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
      areaId: user.area_id,
      areaName: area?.name || 'Sem área',
      overallProgress,
      trailsCompleted,
      totalTrails: visible.length,
      lastActivity,
      status,
    };
  });

  // ── KPIs ──
  const activeUsers = userMetrics.filter((u) => u.overallProgress > 0).length;
  const avgProgress =
    userMetrics.length > 0
      ? Math.round(userMetrics.reduce((s, u) => s + u.overallProgress, 0) / userMetrics.length)
      : 0;
  const totalTrailsCompleted = userMetrics.reduce((s, u) => s + u.trailsCompleted, 0);

  const filteredCerts = areaIds.length > 0
    ? certificates.filter((c) => {
        const user = filteredUsers.find((u) => u.id === c.user_id);
        return !!user;
      })
    : certificates;

  // Quiz blocked count
  const LOCKOUT_HOURS = 72;
  const quizAttempts = quizAttemptsRes.data || [];
  const attemptGroups = new Map<string, typeof quizAttempts>();
  quizAttempts.forEach((a) => {
    const key = `${a.user_id}:${a.module_id}`;
    const group = attemptGroups.get(key) || [];
    group.push(a);
    attemptGroups.set(key, group);
  });

  let quizBlockedCount = 0;
  const nowDate = new Date();
  for (const [, group] of attemptGroups) {
    group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latestCycle = group[0].cycle;
    const cycleAttempts = group.filter((a) => a.cycle === latestCycle);
    if (cycleAttempts.length >= 3) {
      const blockedUntil = new Date(
        new Date(cycleAttempts[0].created_at).getTime() + LOCKOUT_HOURS * 60 * 60 * 1000
      );
      if (blockedUntil > nowDate) {
        const userId = group[0].user_id;
        if (areaIds.length === 0 || filteredUsers.some((u) => u.id === userId)) {
          quizBlockedCount++;
        }
      }
    }
  }

  const kpis: KPIData = {
    totalUsers: filteredUsers.length,
    activeUsers,
    averageProgress: avgProgress,
    totalTrailsCompleted: totalTrailsCompleted,
    certificatesIssued: filteredCerts.length,
    overdueCount: userMetrics.filter((u) => u.status === 'atrasado').length,
    quizBlockedCount,
  };

  // ── Status Distribution ──
  const statusDistribution: StatusDistributionItem[] = [
    { name: 'Em dia', value: userMetrics.filter((u) => u.status === 'em_dia').length, color: '#10B981' },
    { name: 'Regular', value: userMetrics.filter((u) => u.status === 'regular').length, color: '#F59E0B' },
    { name: 'Atrasado', value: userMetrics.filter((u) => u.status === 'atrasado').length, color: '#EF4444' },
  ];

  // ── Area Comparison (admin only) ──
  const areaComparison: AreaComparisonItem[] = areaIds.length === 0
    ? areas.map((area) => {
        const areaUsers = userMetrics.filter((u) => u.areaId === area.id);
        return {
          areaId: area.id,
          areaName: area.name,
          areaColor: area.color || '#1B4D3E',
          memberCount: areaUsers.length,
          averageProgress:
            areaUsers.length > 0
              ? Math.round(areaUsers.reduce((s, u) => s + u.overallProgress, 0) / areaUsers.length)
              : 0,
          trailsCompleted: areaUsers.reduce((s, u) => s + u.trailsCompleted, 0),
          overdueCount: areaUsers.filter((u) => u.status === 'atrasado').length,
        };
      })
    : [];

  // ── Trail Analytics ──
  const visibleTrails = areaIds.length > 0
    ? trails.filter((t) => isTrailVisibleToUser(t, areaIds, trailAreasMap.get(t.id) || [], trailUsersMap.get(t.id) || []))
    : trails;

  const trailAnalytics: TrailAnalyticsItem[] = visibleTrails.map((trail) => {
    const trailMods = getTrailModules(trail.id);
    const quizMods = trailMods.filter((m) => m.type === 'quiz');

    // Quem deveria ver essa trilha
    const trailAreaIds = trailAreasMap.get(trail.id) || [];
    const trailUserIds = trailUsersMap.get(trail.id) || [];
    const enrolledUsers = filteredUsers.filter((u) => {
      const uAreaIds = userAreasMap.get(u.id) || (u.area_id ? [u.area_id] : []);
      return isTrailVisibleToUser(trail, uAreaIds, trailAreaIds, trailUserIds, u.id);
    });

    let totalProgress = 0;
    let completedCount = 0;
    const quizScores: number[] = [];
    let overdueCount = 0;

    enrolledUsers.forEach((user) => {
      const userProg = progress.filter((p) => p.user_id === user.id);
      const completedModuleIds = new Set(
        userProg.filter((p) => p.completed).map((p) => p.module_id)
      );

      const userCompleted = trailMods.filter((m) => completedModuleIds.has(m.id)).length;
      const userProgress = calculateProgress(userCompleted, trailMods.length);
      totalProgress += userProgress;

      if (trailMods.length > 0 && userCompleted === trailMods.length) {
        completedCount++;
      }

      // Quiz scores
      quizMods.forEach((qm) => {
        const qp = userProg.find((p) => p.module_id === qm.id && p.completed && p.score != null);
        if (qp) quizScores.push(qp.score!);
      });

      // Deadline check
      if (trail.deadline && userProgress < 100) {
        const deadlineDate = new Date(trail.deadline.split('T')[0] + 'T12:00:00Z');
        if (deadlineDate.getTime() < Date.now()) {
          overdueCount++;
        }
      }
    });

    return {
      trailId: trail.id,
      trailName: trail.name,
      trailType: trail.type,
      totalEnrolled: enrolledUsers.length,
      completedCount,
      averageProgress:
        enrolledUsers.length > 0 ? Math.round(totalProgress / enrolledUsers.length) : 0,
      averageQuizScore:
        quizScores.length > 0
          ? Math.round(quizScores.reduce((s, v) => s + v, 0) / quizScores.length)
          : null,
      deadline: trail.deadline,
      overdueCount,
    };
  });

  // ── User Ranking ──
  const userRanking: UserRankingItem[] = userMetrics
    .sort((a, b) => b.overallProgress - a.overallProgress)
    .map((u) => ({
      userId: u.userId,
      userName: u.userName,
      email: u.email,
      avatarUrl: u.avatarUrl,
      areaName: u.areaName,
      overallProgress: u.overallProgress,
      trailsCompleted: u.trailsCompleted,
      totalTrails: u.totalTrails,
      lastActivity: u.lastActivity,
      status: u.status,
    }));

  // ── Timeline (últimos 30 dias) ──
  const now = new Date();
  const timeline: TimelinePoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayCompletions = progress.filter((p) => {
      if (!p.completed || !p.completed_at) return false;
      if (areaIds.length > 0) {
        const user = filteredUsers.find((u) => u.id === p.user_id);
        if (!user) return false;
      }
      return p.completed_at.split('T')[0] === dateStr;
    }).length;

    const dayCerts = filteredCerts.filter(
      (c) => c.issued_at && c.issued_at.split('T')[0] === dateStr
    ).length;

    timeline.push({ date: dateStr, completions: dayCompletions, certificates: dayCerts });
  }

  // ── Deadlines ──
  const deadlines: DeadlineItem[] = visibleTrails
    .filter((t) => t.deadline)
    .map((trail) => {
      const trailMods = getTrailModules(trail.id);
      const deadlineTrailAreaIds = trailAreasMap.get(trail.id) || [];
      const deadlineTrailUserIds = trailUsersMap.get(trail.id) || [];
      const enrolledUsers = filteredUsers.filter((u) => {
        const uAreaIds = userAreasMap.get(u.id) || (u.area_id ? [u.area_id] : []);
        return isTrailVisibleToUser(trail, uAreaIds, deadlineTrailAreaIds, deadlineTrailUserIds, u.id);
      });

      let completedUsers = 0;
      const overdueUsers: string[] = [];

      enrolledUsers.forEach((user) => {
        const userProg = progress.filter((p) => p.user_id === user.id);
        const completedModuleIds = new Set(
          userProg.filter((p) => p.completed).map((p) => p.module_id)
        );
        const allDone = trailMods.length > 0 && trailMods.every((m) => completedModuleIds.has(m.id));

        if (allDone) {
          completedUsers++;
        } else {
          const deadlineDate = new Date(trail.deadline!.split('T')[0] + 'T12:00:00Z');
          if (deadlineDate.getTime() < Date.now()) {
            overdueUsers.push(user.name);
          }
        }
      });

      return {
        trailId: trail.id,
        trailName: trail.name,
        trailType: trail.type,
        deadline: trail.deadline!,
        totalUsers: enrolledUsers.length,
        completedUsers,
        overdueUsers,
      };
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  // ── Content Analytics ──
  const filteredUserIds = new Set(filteredUsers.map((u) => u.id));
  const filteredProgress = areaIds.length > 0
    ? progress.filter((p) => filteredUserIds.has(p.user_id))
    : progress;

  const moduleTypes: ('video' | 'document' | 'quiz')[] = ['video', 'document', 'quiz'];
  const moduleTypeBreakdown = moduleTypes.map((type) => {
    const typeMods = modules.filter((m) => m.type === type);
    const typeModIds = new Set(typeMods.map((m) => m.id));

    const relevantProgress = filteredProgress.filter((p) => typeModIds.has(p.module_id));
    const completedOfType = relevantProgress.filter((p) => p.completed).length;

    return {
      type,
      count: typeMods.length,
      avgCompletion:
        relevantProgress.length > 0
          ? Math.round((completedOfType / relevantProgress.length) * 100)
          : 0,
    };
  });

  const quizModules = modules.filter((m) => m.type === 'quiz');
  const quizPerformance = quizModules
    .map((qm) => {
      const trail = trails.find((t) => t.id === qm.trail_id);
      const attempts = filteredProgress.filter(
        (p) => p.module_id === qm.id && p.completed && p.score != null
      );
      if (attempts.length === 0) return null;

      return {
        trailName: trail?.name || 'Desconhecida',
        moduleName: qm.title,
        averageScore: Math.round(
          attempts.reduce((s, a) => s + a.score!, 0) / attempts.length
        ),
        attemptCount: attempts.length,
      };
    })
    .filter(Boolean) as ContentAnalyticsData['quizPerformance'];

  // Tempo por tipo de módulo
  const moduleTypeLabelsMap: Record<string, string> = {
    video: 'Vídeo',
    document: 'Documento',
    quiz: 'Quiz',
  };

  const timeByType = moduleTypes.map((type) => {
    const typeMods = modules.filter((m) => m.type === type);
    const typeModIds = new Set(typeMods.map((m) => m.id));
    const relevantProgress = filteredProgress.filter(
      (p) => typeModIds.has(p.module_id) && p.time_spent
    );
    const totalSeconds = relevantProgress.reduce(
      (sum, p) => sum + (p.time_spent || 0),
      0
    );
    return {
      type,
      label: moduleTypeLabelsMap[type] || type,
      totalSeconds,
      avgSeconds:
        relevantProgress.length > 0
          ? Math.round(totalSeconds / relevantProgress.length)
          : 0,
    };
  });

  // Tempo por usuário
  const timeByUser = filteredUsers
    .map((user) => {
      const userProg = progress.filter((p) => p.user_id === user.id && p.time_spent);
      const totalSeconds = userProg.reduce(
        (sum, p) => sum + (p.time_spent || 0),
        0
      );
      return { userName: user.name, totalSeconds };
    })
    .filter((u) => u.totalSeconds > 0)
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  const contentAnalytics: ContentAnalyticsData = {
    moduleTypeBreakdown,
    quizPerformance,
    timeByType,
    timeByUser,
  };

  return {
    kpis,
    statusDistribution,
    areaComparison,
    trailAnalytics,
    userRanking,
    timeline,
    deadlines,
    contentAnalytics,
    isAdmin: isAdmin && areaIds.length === 0,
  };
}

// ============================================
// KPI Cards (Server Component)
// ============================================

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  subtext?: string;
}

function KPICard({ icon, label, value, color, subtext }: KPICardProps) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-[11px] sm:text-xs font-medium text-[#7A7468] dark:text-[#9A9590] leading-tight break-words">
            {label}
          </p>
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
        </div>
        <p className="text-xl sm:text-2xl font-bold text-[#2D2A26] dark:text-[#E8E5E0] leading-tight">
          {value}
        </p>
        {subtext && (
          <p className="text-[10px] sm:text-xs text-[#7A7468] dark:text-[#9A9590] mt-1 leading-tight">
            {subtext}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Skeleton
// ============================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-[500px] w-full" />
    </div>
  );
}

// ============================================
// Page Component
// ============================================

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const [user, { area }] = await Promise.all([getUserData(), searchParams]);

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'admin' && user.role !== 'gestor') {
    redirect('/');
  }

  // Determinar áreas
  let selectedAreaIds: string[] = [];
  if (user.role === 'gestor') {
    // Buscar áreas do gestor via user_areas
    const gestorAdminClient = createAdminClient();
    const gestorAreasMap = await getUserAreasMap(gestorAdminClient, [user.id]);
    selectedAreaIds = gestorAreasMap.get(user.id) || (user.area_id ? [user.area_id] : []);
  } else if (user.role === 'admin' && area && area !== 'all') {
    selectedAreaIds = [area];
  }

  // Para compatibilidade com MetricsAreaSelector (que usa string | null)
  const selectedAreaId: string | null = selectedAreaIds.length === 1 ? selectedAreaIds[0] : null;

  const isAdmin = user.role === 'admin';

  // Buscar dados em paralelo
  const [areas, metrics] = await Promise.all([
    isAdmin ? getAllAreas() : Promise.resolve([]),
    getMetricsData(selectedAreaIds, isAdmin),
  ]);

  const { kpis } = metrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#2D2A26] dark:text-[#E8E5E0] mb-1">
          Dashboard de Métricas
        </h1>
        <p className="text-[#7A7468] dark:text-[#9A9590]">
          Visão geral de progresso e engajamento na plataforma
        </p>
      </div>

      {/* Seletor de área (admin only) */}
      {isAdmin && (
        <MetricsAreaSelector areas={areas} selectedAreaId={selectedAreaId} />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        <KPICard
          icon={<Users className="w-5 h-5" />}
          label="Colaboradores"
          value={kpis.totalUsers}
          color="#1B4D3E"
        />
        <KPICard
          icon={<UserCheck className="w-5 h-5" />}
          label="Ativos"
          value={kpis.activeUsers}
          color="#3B82F6"
          subtext={`${kpis.totalUsers > 0 ? Math.round((kpis.activeUsers / kpis.totalUsers) * 100) : 0}% do total`}
        />
        <KPICard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Progresso Médio"
          value={`${kpis.averageProgress}%`}
          color="#10B981"
        />
        <KPICard
          icon={<GraduationCap className="w-5 h-5" />}
          label="Trilhas Concluídas"
          value={kpis.totalTrailsCompleted}
          color="#34D399"
        />
        <KPICard
          icon={<Award className="w-5 h-5" />}
          label="Certificados"
          value={kpis.certificatesIssued}
          color="#D4A053"
        />
        <KPICard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Atrasados"
          value={kpis.overdueCount}
          color="#EF4444"
          subtext={`${kpis.totalUsers > 0 ? Math.round((kpis.overdueCount / kpis.totalUsers) * 100) : 0}% do total`}
        />
        <KPICard
          icon={<Lock className="w-5 h-5" />}
          label="Quizzes Bloqueados"
          value={kpis.quizBlockedCount}
          color="#DC2626"
        />
      </div>

      {/* Dashboard com Tabs */}
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <MetricsDashboardClient data={metrics} />
      </Suspense>

      {/* Quizzes Bloqueados */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <QuizBlockedSection areaIds={selectedAreaIds} />
      </Suspense>
    </div>
  );
}
