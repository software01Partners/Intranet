import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Cron job que exclui permanentemente itens na lixeira com mais de 30 dias.
 * Chamado diariamente pelo Vercel Cron.
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Deletar módulos expirados primeiro (antes das trilhas, por causa do CASCADE)
    const { data: deletedModules } = await admin
      .from('modules')
      .delete()
      .lt('deleted_at', cutoff)
      .not('deleted_at', 'is', null)
      .select('id');

    // Deletar trilhas expiradas (CASCADE remove módulos restantes)
    const { data: deletedTrails } = await admin
      .from('trails')
      .delete()
      .lt('deleted_at', cutoff)
      .not('deleted_at', 'is', null)
      .select('id');

    // Deletar áreas expiradas
    const { data: deletedAreas } = await admin
      .from('areas')
      .delete()
      .lt('deleted_at', cutoff)
      .not('deleted_at', 'is', null)
      .select('id');

    return NextResponse.json({
      message: 'Purge da lixeira concluído',
      purged: {
        trails: deletedTrails?.length || 0,
        modules: deletedModules?.length || 0,
        areas: deletedAreas?.length || 0,
      },
    });
  } catch (error) {
    console.error('Erro no cron de purge da lixeira:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
