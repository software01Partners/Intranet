import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TeamMember } from '@/app/(dashboard)/gestor/page';
import { calculateProgress } from '@/lib/utils';
import { getTrailAreasMap, isTrailVisibleToUser } from '@/lib/trail-areas';
import { getUserAreasMap, getUserIdsByAreas } from '@/lib/user-areas';
import { getTrailUsersMap } from '@/lib/trail-users';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get('areaId');
    const areaIdsParam = searchParams.get('areaIds');

    // Verificar autenticação
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Buscar dados do usuário
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('role, area_id')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Erro ao buscar dados do usuário' },
        { status: 500 }
      );
    }

    // Verificar permissão
    if (userData.role !== 'gestor' && userData.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Determinar áreas alvo
    let targetAreaIds: string[] = [];
    if (userData.role === 'gestor') {
      // Fetch gestor's areas from user_areas
      const gestorAreasMap = await getUserAreasMap(admin, [authUser.id]);
      targetAreaIds = gestorAreasMap.get(authUser.id) || (userData.area_id ? [userData.area_id] : []);
    } else if (userData.role === 'admin') {
      // Support both areaIds (comma-separated) and legacy areaId param
      if (areaIdsParam) {
        targetAreaIds = areaIdsParam.split(',').filter(Boolean);
      } else if (areaId && areaId !== 'all') {
        targetAreaIds = [areaId];
      }
      // empty → fetch all
    }

    // Buscar colaboradores das áreas via user_areas
    let memberIds: string[] = [];
    if (targetAreaIds.length > 0) {
      memberIds = await getUserIdsByAreas(admin, targetAreaIds);
    }

    let membersQuery = admin
      .from('users')
      .select('id, name, email, avatar_url, area_id')
      .eq('role', 'colaborador');

    if (targetAreaIds.length > 0) {
      if (memberIds.length === 0) {
        return NextResponse.json([]);
      }
      membersQuery = membersQuery.in('id', memberIds);
    }

    const { data: members, error: membersError } = await membersQuery;

    if (membersError || !members || members.length === 0) {
      return NextResponse.json([]);
    }

    const allMemberIds = members.map((m) => m.id);

    // Buscar user_areas para todos os membros
    const membersAreasMap = await getUserAreasMap(admin, allMemberIds);

    // Buscar todas as trilhas visíveis (excluir deletadas)
    const { data: allTrails } = await admin
      .from('trails')
      .select('id, name, type, area_id')
      .is('deleted_at', null);

    if (!allTrails || allTrails.length === 0) {
      return NextResponse.json(
        members.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          avatar_url: member.avatar_url,
          overallProgress: 0,
          trailsCompleted: 0,
          totalTrails: 0,
          lastModuleCompletedAt: null,
          status: 'atrasado' as const,
        }))
      );
    }

    // Buscar trail_areas e trail_users
    const trailIds = allTrails.map((t) => t.id);
    const [trailAreasMap, trailUsersMap] = await Promise.all([
      getTrailAreasMap(admin, trailIds),
      getTrailUsersMap(admin, trailIds),
    ]);

    // Filtrar trilhas visíveis para cada membro (multi-area + trail_users)
    const visibleTrailsByMember = new Map<string, string[]>();
    members.forEach((member) => {
      const memberAreaIds = membersAreasMap.get(member.id) || (member.area_id ? [member.area_id] : []);
      const visible = allTrails.filter((trail) =>
        isTrailVisibleToUser(
          trail,
          memberAreaIds,
          trailAreasMap.get(trail.id) || [],
          trailUsersMap.get(trail.id) || [],
          member.id
        )
      );
      visibleTrailsByMember.set(member.id, visible.map((t) => t.id));
    });

    // Buscar todos os módulos (excluir deletados)
    const { data: allModules } = await admin
      .from('modules')
      .select('id, trail_id')
      .is('deleted_at', null);

    if (!allModules) {
      return NextResponse.json(
        members.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          avatar_url: member.avatar_url,
          overallProgress: 0,
          trailsCompleted: 0,
          totalTrails: 0,
          lastModuleCompletedAt: null,
          status: 'atrasado' as const,
        }))
      );
    }

    // Buscar progresso de todos os membros
    const { data: allProgress } = await admin
      .from('user_progress')
      .select('user_id, module_id, completed, completed_at')
      .in('user_id', allMemberIds);

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
      const trailsProgress = new Map<
        string,
        { total: number; completed: number }
      >();
      memberModules.forEach((module) => {
        const trailId = module.trail_id;
        const current = trailsProgress.get(trailId) || {
          total: 0,
          completed: 0,
        };
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

    return NextResponse.json(teamMembers);
  } catch (error) {
    console.error('Erro ao buscar equipe:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados da equipe' },
      { status: 500 }
    );
  }
}
