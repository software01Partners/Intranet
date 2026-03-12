import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSignedVideoUrl } from '@/lib/r2';
import { TrailPlayerClient } from '@/components/player/TrailPlayerClient';
import { Module, UserProgress, Trail, TrailType } from '@/lib/types';
import { calculateProgress } from '@/lib/utils';

interface ModuleWithProgress extends Module {
  progress: UserProgress | null;
  isUnlocked: boolean;
  signedUrl?: string;
}

async function getTrailData(
  trailId: string,
  userId: string
): Promise<{
  trail: Trail | null;
  modules: ModuleWithProgress[];
  trailProgress: number;
}> {
  const supabase = await createClient();

  // Buscar trilha
  const { data: trail, error: trailError } = await supabase
    .from('trails')
    .select('*')
    .eq('id', trailId)
    .single();

  if (trailError || !trail) {
    return { trail: null, modules: [], trailProgress: 0 };
  }

  // Buscar módulos ordenados
  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select('*')
    .eq('trail_id', trailId)
    .order('sort_order', { ascending: true });

  if (modulesError || !modules || modules.length === 0) {
    return { trail, modules: [], trailProgress: 0 };
  }

  // Buscar progresso do usuário para todos os módulos
  const moduleIds = modules.map((m) => m.id);
  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .in('module_id', moduleIds);

  // Criar mapa de progresso por módulo
  const progressMap = new Map<string, UserProgress>();
  userProgress?.forEach((progress) => {
    progressMap.set(progress.module_id, progress);
  });

  // Calcular progresso da trilha
  const completedModules = modules.filter(
    (m) => progressMap.get(m.id)?.completed
  ).length;
  const trailProgress = calculateProgress(completedModules, modules.length);

  // Processar módulos com progresso e desbloqueio
  const modulesWithProgress: ModuleWithProgress[] = [];

  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    const progress = progressMap.get(module.id) || null;

    // Módulo está desbloqueado se:
    // 1. É o primeiro módulo (i === 0)
    // 2. O módulo anterior está concluído
    const isUnlocked =
      i === 0 ||
      (modules[i - 1] &&
        (progressMap.get(modules[i - 1].id)?.completed ?? false));

    let signedUrl: string | undefined;

    // Gerar signed URL se necessário
    if (module.content_url) {
      try {
        if (module.type === 'video') {
          // Para vídeos, content_url é a chave no R2
          signedUrl = await getSignedVideoUrl(module.content_url);
        } else if (module.type === 'document') {
          // Para documentos, content_url é o path no Supabase Storage
          const { data: signedUrlData } = await supabase.storage
            .from('documents')
            .createSignedUrl(module.content_url, 3600); // 1 hora

          if (signedUrlData) {
            signedUrl = signedUrlData.signedUrl;
          }
        }
      } catch (error) {
        console.error(
          `Erro ao gerar signed URL para módulo ${module.id}:`,
          error
        );
      }
    }

    modulesWithProgress.push({
      ...module,
      progress,
      isUnlocked,
      signedUrl,
    });
  }

  return {
    trail,
    modules: modulesWithProgress,
    trailProgress,
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modulo?: string }>;
}

export default async function TrailPlayerPage({
  params,
  searchParams,
}: PageProps) {
  const { id: trailId } = await params;
  const { modulo: moduleParam } = await searchParams;

  const supabase = await createClient();

  // Verificar autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Buscar dados da trilha
  const { trail, modules, trailProgress } = await getTrailData(
    trailId,
    user.id
  );

  if (!trail) {
    notFound();
  }

  // Determinar módulo inicial
  let initialModuleId: string;

  if (moduleParam && modules.find((m) => m.id === moduleParam)) {
    // Se há módulo na query string e ele existe, usar ele
    initialModuleId = moduleParam;
  } else {
    // Caso contrário, usar o primeiro módulo desbloqueado não concluído
    const firstUnlocked = modules.find(
      (m) => m.isUnlocked && !m.progress?.completed
    );

    if (firstUnlocked) {
      initialModuleId = firstUnlocked.id;
    } else {
      // Se todos estão concluídos, usar o último
      initialModuleId = modules[modules.length - 1]?.id || modules[0]?.id || '';
    }
  }

  if (!initialModuleId || modules.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-[#8888A0]">Esta trilha ainda não possui módulos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <TrailPlayerClient
        trail={{
          id: trail.id,
          name: trail.name,
          type: trail.type,
        }}
        modules={modules}
        initialModuleId={initialModuleId}
        trailProgress={trailProgress}
      />
    </div>
  );
}
