import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET — dados do usuário autenticado
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('users')
      .select('id, name, email, role, area_id, avatar_url')
      .eq('id', authUser.id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    // Buscar áreas do usuário via user_areas
    const { data: userAreas } = await admin
      .from('user_areas')
      .select('area_id')
      .eq('user_id', authUser.id);

    const area_ids = (userAreas || []).map((ua) => ua.area_id);
    // Fallback: se user_areas vazio mas area_id existe, incluir
    if (area_ids.length === 0 && data.area_id) {
      area_ids.push(data.area_id);
    }

    return NextResponse.json({ ...data, area_ids });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
