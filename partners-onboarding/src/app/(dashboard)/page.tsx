import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { User, Trail, Module, UserProgress, Certificate } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ContinueButton } from '@/components/dashboard/ContinueButton';
import {
  BookOpen,
  CheckCircle2,
  Award,
  FileText,
  Video,
  HelpCircle,
} from 'lucide-react';
import { formatDateFull, calculateProgress } from '@/lib/utils';
import Link from 'next/link';
import { CertificateDownloadButton } from '@/components/certificate/CertificateDownloadButton';

// Tipos para os dados agregados
interface DashboardStats {
  trailsInProgress: number;
  modulesCompleted: number;
  overallProgress: number;
  certificates: number;
}

interface TrailWithProgress extends Trail {
  totalModules: number;
  completedModules: number;
  progress: number;
}

interface LastModule extends Module {
  trail: Trail;
  progress: UserProgress | null;
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

// Função para buscar estatísticas
async function getDashboardStats(
  userId: string,
  areaId: string | null
): Promise<DashboardStats> {
  const supabase = await createClient();

  // Buscar todas as trilhas visíveis para o usuário
  // O RLS já filtra automaticamente, então buscamos todas
  const { data: visibleTrails } = await supabase.from('trails').select('id');

  if (!visibleTrails || visibleTrails.length === 0) {
    return {
      trailsInProgress: 0,
      modulesCompleted: 0,
      overallProgress: 0,
      certificates: 0,
    };
  }

  const trailIds = visibleTrails.map((t) => t.id);

  // Buscar todos os módulos dessas trilhas
  const { data: modulesData } = await supabase
    .from('modules')
    .select('id, trail_id')
    .in('trail_id', trailIds);

  if (!modulesData || modulesData.length === 0) {
    return {
      trailsInProgress: 0,
      modulesCompleted: 0,
      overallProgress: 0,
      certificates: 0,
    };
  }

  const moduleIds = modulesData.map((m) => m.id);

  // Buscar progresso do usuário
  const { data: userProgressData } = await supabase
    .from('user_progress')
    .select('module_id, completed')
    .eq('user_id', userId)
    .in('module_id', moduleIds);

  // Contar módulos concluídos
  const modulesCompleted =
    userProgressData?.filter((up) => up.completed).length || 0;

  // Contar trilhas em andamento (que têm pelo menos um módulo com progresso)
  const trailsWithProgress = new Set(
    userProgressData?.map((up) => {
      const module = modulesData.find((m) => m.id === up.module_id);
      return module?.trail_id;
    }) || []
  );
  const trailsInProgress = trailsWithProgress.size;

  // Calcular progresso geral
  const overallProgress =
    modulesData.length > 0
      ? calculateProgress(modulesCompleted, modulesData.length)
      : 0;

  // Contar certificados
  const { count: certificatesCount } = await supabase
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    trailsInProgress,
    modulesCompleted,
    overallProgress,
    certificates: certificatesCount || 0,
  };
}

// Função para buscar último módulo não concluído
async function getLastModule(userId: string): Promise<LastModule | null> {
  const supabase = await createClient();

  // Buscar último progresso não concluído, ordenado por created_at DESC
  const { data: lastProgressList } = await supabase
    .from('user_progress')
    .select('*, modules!inner(id, trail_id, title, type, content_url, duration, sort_order, created_at, trails(*))')
    .eq('user_id', userId)
    .eq('completed', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (lastProgressList && lastProgressList.length > 0) {
    const lastProgressData = lastProgressList[0];
    const moduleData = lastProgressData.modules as Module & { trails: Trail };
    return {
      ...moduleData,
      trail: moduleData.trails,
      progress: lastProgressData as UserProgress,
    };
  }

  // Se não há progresso não concluído, buscar o próximo módulo a fazer
  // Buscar trilhas visíveis (RLS já filtra)
  const { data: visibleTrails } = await supabase
    .from('trails')
    .select('id')
    .order('sort_order', { ascending: true })
    .limit(10);

  if (!visibleTrails || visibleTrails.length === 0) return null;

  // Buscar primeiro módulo da primeira trilha (ordenado por sort_order)
  const { data: firstModuleList } = await supabase
    .from('modules')
    .select('*, trails(*)')
    .in(
      'trail_id',
      visibleTrails.map((t) => t.id)
    )
    .order('sort_order', { ascending: true })
    .limit(1);

  if (!firstModuleList || firstModuleList.length === 0) return null;

  const firstModule = firstModuleList[0];

  return {
    ...(firstModule as Module & { trails: Trail }),
    trail: firstModule.trails as Trail,
    progress: null,
  };
}

// Função para buscar trilhas obrigatórias com progresso
async function getRequiredTrails(
  userId: string,
  areaId: string | null
): Promise<TrailWithProgress[]> {
  const supabase = await createClient();

  // Buscar trilhas obrigatórias visíveis
  // O RLS já filtra automaticamente, então buscamos todas e filtramos por tipo
  const { data: allTrails } = await supabase.from('trails').select('*');

  // Filtrar apenas obrigatórias (global e da área)
  const trailsData = allTrails?.filter(
    (trail) =>
      trail.type === 'obrigatoria_global' ||
      (trail.type === 'obrigatoria_area' && trail.area_id === areaId)
  ) || [];

  if (!trailsData || trailsData.length === 0) {
    return [];
  }

  const trailIds = trailsData.map((t) => t.id);

  // Buscar módulos de cada trilha
  const { data: modulesData } = await supabase
    .from('modules')
    .select('id, trail_id')
    .in('trail_id', trailIds);

  if (!modulesData) {
    return [];
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
      totalModules > 0
        ? calculateProgress(completedModules, totalModules)
        : 0;

    return {
      ...(trail as Trail),
      totalModules,
      completedModules,
      progress,
    };
  });

  // Ordenar: não concluídas primeiro (progress < 100), depois por progresso crescente
  return trailsWithProgress.sort((a, b) => {
    const aCompleted = a.progress === 100;
    const bCompleted = b.progress === 100;

    if (aCompleted && !bCompleted) return 1;
    if (!aCompleted && bCompleted) return -1;

    return a.progress - b.progress;
  });
}

// Função para buscar certificados do usuário
async function getUserCertificates(userId: string): Promise<
  Array<{
    id: string;
    trail_id: string;
    trail_name: string;
    issued_at: string;
  }>
> {
  const supabase = await createClient();

  const { data: certificates, error } = await supabase
    .from('certificates')
    .select('id, trail_id, issued_at')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });

  if (error || !certificates) {
    return [];
  }

  // Buscar nomes das trilhas separadamente
  const trailIds = certificates.map((c) => c.trail_id);
  const { data: trails } = await supabase
    .from('trails')
    .select('id, name')
    .in('id', trailIds);

  const trailMap = new Map<string, string>();
  trails?.forEach((trail) => {
    trailMap.set(trail.id, trail.name);
  });

  return certificates.map((cert) => ({
    id: cert.id,
    trail_id: cert.trail_id,
    trail_name: trailMap.get(cert.trail_id) || 'Trilha',
    issued_at: cert.issued_at,
  }));
}

// Função para buscar trilhas optativas com progresso
async function getOptionalTrails(
  userId: string
): Promise<TrailWithProgress[]> {
  const supabase = await createClient();

  // Buscar trilhas optativas
  const { data: trailsData } = await supabase
    .from('trails')
    .select('*')
    .eq('type', 'optativa');

  if (!trailsData || trailsData.length === 0) {
    return [];
  }

  const trailIds = trailsData.map((t) => t.id);

  // Buscar módulos de cada trilha
  const { data: modulesData } = await supabase
    .from('modules')
    .select('id, trail_id')
    .in('trail_id', trailIds);

  if (!modulesData) {
    return [];
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
      totalModules > 0
        ? calculateProgress(completedModules, totalModules)
        : 0;

    return {
      ...(trail as Trail),
      totalModules,
      completedModules,
      progress,
    };
  });

  return trailsWithProgress;
}

// Componente de Skeleton para Stats Cards
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

// Componente de Skeleton para último módulo
function LastModuleSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  );
}

// Componente de Skeleton para trilhas
function TrailsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-2 w-full mb-2" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Componente para exibir as estatísticas
async function StatsCards({
  userId,
  areaId,
}: {
  userId: string;
  areaId: string | null;
}) {
  const stats = await getDashboardStats(userId, areaId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-l-4 border-l-[#6B2FA0] dark:border-l-[#8B5CF6]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3C4] dark:text-[#8888A0] mb-1">
                Trilhas em Andamento
              </p>
              <p className="text-2xl font-bold text-[#1A1D2E] dark:text-[#E8E8ED]">
                {stats.trailsInProgress}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#6B2FA0]/10 dark:bg-[#8B5CF6]/15 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#6B2FA0] dark:text-[#8B5CF6]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-[#10B981]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3C4] dark:text-[#8888A0] mb-1">
                Módulos Concluídos
              </p>
              <p className="text-2xl font-bold text-[#1A1D2E] dark:text-[#E8E8ED]">
                {stats.modulesCompleted}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-[#3B82F6]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3C4] dark:text-[#8888A0] mb-1">
                Progresso Geral
              </p>
              <div className="mt-2">
                <ProgressRing value={stats.overallProgress} size={56} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-[#F5A623]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3C4] dark:text-[#8888A0] mb-1">
                Certificados
              </p>
              <p className="text-2xl font-bold text-[#1A1D2E] dark:text-[#E8E8ED]">
                {stats.certificates}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#F5A623]/10 flex items-center justify-center">
              <Award className="w-5 h-5 text-[#F5A623]" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para exibir último módulo
async function LastModuleCard({ userId }: { userId: string }) {
  const lastModule = await getLastModule(userId);

  if (!lastModule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Continuar de onde parou</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={BookOpen}
            title="Nada em andamento"
            description="Você ainda não iniciou nenhum módulo. Explore as trilhas disponíveis para começar!"
          />
        </CardContent>
      </Card>
    );
  }

  // Calcular progresso da trilha
  const supabase = await createClient();
  const { data: trailModules } = await supabase
    .from('modules')
    .select('id')
    .eq('trail_id', lastModule.trail_id);

  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('module_id, completed')
    .eq('user_id', userId)
    .in(
      'module_id',
      trailModules?.map((m) => m.id) || []
    );

  const totalModules = trailModules?.length || 0;
  const completedModules =
    userProgress?.filter((up) => up.completed).length || 0;
  const trailProgress =
    totalModules > 0
      ? calculateProgress(completedModules, totalModules)
      : 0;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return Video;
      case 'document':
        return FileText;
      case 'quiz':
        return HelpCircle;
      default:
        return FileText;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'video':
        return 'Vídeo';
      case 'document':
        return 'Documento';
      case 'quiz':
        return 'Quiz';
      default:
        return type;
    }
  };

  const getTypeColor = (
    type: string
  ): 'blue' | 'purple' | 'yellow' | 'green' => {
    switch (type) {
      case 'video':
        return 'blue';
      case 'document':
        return 'purple';
      case 'quiz':
        return 'yellow';
      default:
        return 'purple';
    }
  };

  const TypeIcon = getTypeIcon(lastModule.type);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Continuar de onde parou</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge color={getTypeColor(lastModule.type)}>
                <TypeIcon className="w-3 h-3 mr-1" />
                {getTypeLabel(lastModule.type)}
              </Badge>
              <span className="text-sm text-[#6B7194] dark:text-[#8888A0]">
                {lastModule.trail.name}
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#1A1D2E] dark:text-[#E8E8ED] mb-1">
              {lastModule.title}
            </h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B7194] dark:text-[#8888A0]">Progresso da trilha</span>
              <span className="text-[#1A1D2E] dark:text-[#E8E8ED] font-medium">
                {completedModules}/{totalModules} módulos
              </span>
            </div>
            <ProgressBar value={trailProgress} showLabel={false} />
          </div>
          <ContinueButton trailId={lastModule.trail_id} />
        </div>
      </CardContent>
    </Card>
  );
}

// Componente para exibir trilhas obrigatórias
async function RequiredTrailsGrid({
  userId,
  areaId,
}: {
  userId: string;
  areaId: string | null;
}) {
  const trails = await getRequiredTrails(userId, areaId);

  if (trails.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Nenhuma trilha obrigatória"
        description="Não há trilhas obrigatórias disponíveis no momento."
      />
    );
  }

  const getTypeBadge = (trail: Trail) => {
    if (trail.type === 'obrigatoria_global') {
      return <Badge color="obrigatoria_global">Obrigatória Global</Badge>;
    }
    if (trail.type === 'obrigatoria_area') {
      return <Badge color="obrigatoria_area">Obrigatória da Área</Badge>;
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {trails.map((trail) => (
        <Link key={trail.id} href={`/trilhas/${trail.id}`}>
          <Card className="hover:border-[#6B2FA0]/30 dark:hover:border-[#8B5CF6]/30 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-lg">{trail.name}</CardTitle>
                {getTypeBadge(trail)}
              </div>
              {trail.description && (
                <p className="text-sm text-[#6B7194] dark:text-[#8888A0] line-clamp-2">
                  {trail.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B7194] dark:text-[#8888A0]">Progresso</span>
                  <span className="text-[#1A1D2E] dark:text-[#E8E8ED] font-medium">
                    {trail.completedModules}/{trail.totalModules} módulos
                  </span>
                </div>
                <ProgressBar value={trail.progress} showLabel={false} />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// Componente para exibir trilhas optativas
async function OptionalTrailsGrid({ userId }: { userId: string }) {
  const trails = await getOptionalTrails(userId);

  if (trails.length === 0) {
    return null; // Não renderizar seção se não houver optativas
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {trails.map((trail) => (
        <Link key={trail.id} href={`/trilhas/${trail.id}`}>
          <Card className="hover:border-[#6B2FA0]/30 dark:hover:border-[#8B5CF6]/30 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-lg">{trail.name}</CardTitle>
                <Badge color="optativa">Optativa</Badge>
              </div>
              {trail.description && (
                <p className="text-sm text-[#6B7194] dark:text-[#8888A0] line-clamp-2">
                  {trail.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B7194] dark:text-[#8888A0]">Progresso</span>
                  <span className="text-[#1A1D2E] dark:text-[#E8E8ED] font-medium">
                    {trail.completedModules}/{trail.totalModules} módulos
                  </span>
                </div>
                <ProgressBar value={trail.progress} showLabel={false} />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// Componente principal da página
export default async function DashboardPage() {
  const user = await getUserData();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#6B7194] dark:text-[#8888A0]">Erro ao carregar dados do usuário.</p>
      </div>
    );
  }

  const userName = user.name || user.email.split('@')[0];
  const currentDate = formatDateFull(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1A1D2E] dark:text-[#E8E8ED] mb-1">
          Olá, {userName}!
        </h1>
        <p className="text-[#6B7194] dark:text-[#8888A0] capitalize">{currentDate}</p>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards userId={user.id} areaId={user.area_id} />
      </Suspense>

      {/* Continuar de onde parou */}
      <Suspense fallback={<LastModuleSkeleton />}>
        <LastModuleCard userId={user.id} />
      </Suspense>

      {/* Trilhas Obrigatórias */}
      <div>
        <h2 className="text-2xl font-bold text-[#1A1D2E] dark:text-[#E8E8ED] mb-4">
          Trilhas Obrigatórias
        </h2>
        <Suspense fallback={<TrailsSkeleton />}>
          <RequiredTrailsGrid userId={user.id} areaId={user.area_id} />
        </Suspense>
      </div>

      {/* Trilhas Optativas */}
      <Suspense fallback={null}>
        <OptionalTrailsSection userId={user.id} />
      </Suspense>

      {/* Meus Certificados */}
      <Suspense fallback={null}>
        <CertificatesSection userId={user.id} />
      </Suspense>
    </div>
  );
}

// Componente wrapper para trilhas optativas (para poder usar Suspense)
async function OptionalTrailsSection({ userId }: { userId: string }) {
  const trails = await getOptionalTrails(userId);

  if (trails.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1A1D2E] dark:text-[#E8E8ED] mb-4">
        Trilhas Optativas
      </h2>
      <OptionalTrailsGrid userId={userId} />
    </div>
  );
}

// Componente para exibir certificados
async function CertificatesSection({ userId }: { userId: string }) {
  const certificates = await getUserCertificates(userId);

  if (certificates.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1A1D2E] dark:text-[#E8E8ED] mb-4">
        Meus Certificados
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {certificates.map((cert) => (
          <Card key={cert.id}>
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-lg">{cert.trail_name}</CardTitle>
                <div className="w-8 h-8 rounded-full bg-[#F5A623]/10 flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4 text-[#F5A623]" />
                </div>
              </div>
              <p className="text-sm text-[#6B7194] dark:text-[#8888A0]">
                Emitido em {formatDateFull(new Date(cert.issued_at))}
              </p>
            </CardHeader>
            <CardContent>
              <CertificateDownloadButton trailId={cert.trail_id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

