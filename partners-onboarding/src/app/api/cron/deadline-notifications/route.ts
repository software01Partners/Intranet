import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTrailAreasMap } from '@/lib/trail-areas';

/**
 * Cron job que verifica trilhas com prazo vencendo em até 3 dias
 * e cria notificações do tipo "atraso" para usuários que ainda não concluíram.
 *
 * Chamado diariamente pelo Vercel Cron.
 * Protegido por CRON_SECRET para evitar chamadas externas.
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar CRON_SECRET (proteção contra chamadas externas)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const admin = createAdminClient();
    const isDev = process.env.NODE_ENV === 'development';

    // Calcular datas: hoje e daqui 3 dias (apenas YYYY-MM-DD)
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    const in3DaysStr = `${in3Days.getFullYear()}-${String(in3Days.getMonth() + 1).padStart(2, '0')}-${String(in3Days.getDate()).padStart(2, '0')}`;

    // Buscar trilhas com deadline entre hoje e daqui 3 dias (inclusive)
    const { data: trails, error: trailsError } = await admin
      .from('trails')
      .select('id, name, type, area_id, deadline')
      .gte('deadline', today)
      .lte('deadline', in3DaysStr);

    if (trailsError) {
      console.error('Erro ao buscar trilhas com prazo:', trailsError);
      return NextResponse.json({ error: trailsError.message }, { status: 500 });
    }

    if (!trails || trails.length === 0) {
      return NextResponse.json({ message: 'Nenhuma trilha com prazo próximo', notified: 0 });
    }

    // Buscar trail_areas para todas as trilhas com deadline
    const trailAreasMap = await getTrailAreasMap(admin, trails.map((t) => t.id));

    let totalNotifications = 0;

    for (const trail of trails) {
      // Calcular dias restantes para a mensagem
      const deadlineDate = new Date(trail.deadline + 'T12:00:00Z');
      const todayDate = new Date(today + 'T12:00:00Z');
      const diffDays = Math.round((deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      // Buscar usuários que devem ver essa trilha
      const trailAreaIds = trailAreasMap.get(trail.id) || [];
      let usersQuery = admin
        .from('users')
        .select('id');

      if ((trail.type === 'obrigatoria_area' || trail.type === 'optativa_area') && trailAreaIds.length > 0) {
        // Trilha de área: só usuários das áreas vinculadas
        usersQuery = usersQuery.in('area_id', trailAreaIds);
      }
      // obrigatoria_global e optativa_global: todos os usuários

      const { data: users, error: usersError } = await usersQuery;

      if (usersError || !users || users.length === 0) {
        if (isDev) console.log(`[cron] ${trail.name}: sem usuários (${usersError?.message || 'vazio'})`);
        continue;
      }

      const userIds = users.map((u: { id: string }) => u.id);

      // Buscar módulos da trilha
      const { data: modules } = await admin
        .from('modules')
        .select('id')
        .eq('trail_id', trail.id);

      if (!modules || modules.length === 0) {
        if (isDev) console.log(`[cron] ${trail.name}: sem módulos, pulando`);
        continue;
      }

      const moduleIds = modules.map((m: { id: string }) => m.id);

      // Buscar quem já concluiu TODOS os módulos (trilha completa)
      const { data: progressData } = await admin
        .from('user_progress')
        .select('user_id, module_id')
        .in('module_id', moduleIds)
        .eq('completed', true);

      // Contar módulos concluídos por usuário
      const completedByUser = new Map<string, number>();
      if (progressData) {
        for (const p of progressData) {
          completedByUser.set(p.user_id, (completedByUser.get(p.user_id) || 0) + 1);
        }
      }

      // Filtrar: apenas quem NÃO concluiu todos os módulos
      const incompleteUserIds = userIds.filter(
        (uid: string) => (completedByUser.get(uid) || 0) < modules.length
      );

      if (incompleteUserIds.length === 0) {
        if (isDev) console.log(`[cron] ${trail.name}: todos concluíram (${userIds.length} users, ${modules.length} módulos)`);
        continue;
      }

      if (isDev) console.log(`[cron] ${trail.name}: ${incompleteUserIds.length} incompletos de ${userIds.length} users, ${modules.length} módulos`);

      // Verificar se já foi enviada notificação de prazo para essa trilha hoje
      // (evitar duplicatas se o cron rodar mais de uma vez)
      // Busca por mensagem que contenha o nome da trilha (funciona com ou sem related_trail_id)
      const { data: existingNotifs } = await admin
        .from('notifications')
        .select('user_id')
        .eq('type', 'atraso')
        .like('message', `%${trail.name}%`)
        .gte('created_at', today + 'T00:00:00Z')
        .in('user_id', incompleteUserIds);

      const alreadyNotifiedIds = new Set(
        (existingNotifs || []).map((n: { user_id: string }) => n.user_id)
      );

      const usersToNotify = incompleteUserIds.filter(
        (uid: string) => !alreadyNotifiedIds.has(uid)
      );

      if (usersToNotify.length === 0) {
        if (isDev) console.log(`[cron] ${trail.name}: já notificados hoje`);
        continue;
      }

      // Montar mensagem
      let message: string;
      if (diffDays === 0) {
        message = `O prazo da trilha "${trail.name}" vence hoje! Conclua o quanto antes.`;
      } else if (diffDays === 1) {
        message = `O prazo da trilha "${trail.name}" vence amanhã! Não deixe para a última hora.`;
      } else {
        message = `O prazo da trilha "${trail.name}" vence em ${diffDays} dias. Não esqueça de concluí-la!`;
      }

      // Criar notificações em batch
      const notifications = usersToNotify.map((userId: string) => ({
        user_id: userId,
        type: 'atraso' as const,
        message,
        read: false,
        related_trail_id: trail.id,
      }));

      // Tentar inserir com related_trail_id; se falhar (coluna não existe), tentar sem
      let insertError;
      const { error: err1 } = await admin
        .from('notifications')
        .insert(notifications);
      insertError = err1;

      if (insertError) {
        // Fallback: inserir sem related_trail_id caso a coluna não exista
        const notificationsWithoutTrailId = notifications.map(({ related_trail_id, ...rest }) => rest);
        const { error: err2 } = await admin
          .from('notifications')
          .insert(notificationsWithoutTrailId);

        if (err2) {
          console.error(`Erro ao criar notificações para trilha ${trail.id}:`, err2);
          continue;
        }
        if (isDev) console.log(`[cron] ${trail.name}: inserido sem related_trail_id (coluna pode não existir)`);
      }

      totalNotifications += usersToNotify.length;
      if (isDev) console.log(`[cron] ${trail.name}: ${usersToNotify.length} notificações enviadas`);
    }

    return NextResponse.json({
      message: `Notificações de prazo enviadas`,
      notified: totalNotifications,
      trailsChecked: trails.length,
    });
  } catch (error) {
    console.error('Erro no cron de notificações de prazo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
