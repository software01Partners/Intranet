import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST — criar trilha
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar role do usuário (via admin client para evitar RLS)
    const admin = createAdminClient();
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('role, area_id')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (userData.role !== 'admin' && userData.role !== 'gestor') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, type, area_id, duration } = body;

    // Gestor só pode criar trilhas da própria área
    if (userData.role === 'gestor') {
      if (type !== 'obrigatoria_area' || area_id !== userData.area_id) {
        return NextResponse.json(
          { error: 'Gestor só pode criar trilhas obrigatórias da própria área' },
          { status: 403 }
        );
      }
    }

    const { data: trail, error } = await admin
      .from('trails')
      .insert({
        name,
        description: description || null,
        type,
        area_id: area_id || null,
        duration: duration || 0,
        created_by: authUser.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar trilha:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(trail);
  } catch (error) {
    console.error('Erro na API de trilhas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT — atualizar trilha
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('role, area_id')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (userData.role !== 'admin' && userData.role !== 'gestor') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, type, area_id, duration } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da trilha é obrigatório' }, { status: 400 });
    }

    // Gestor só pode editar trilhas da própria área
    if (userData.role === 'gestor') {
      const { data: existingTrail } = await admin
        .from('trails')
        .select('area_id')
        .eq('id', id)
        .single();

      if (!existingTrail || existingTrail.area_id !== userData.area_id) {
        return NextResponse.json({ error: 'Sem permissão para editar esta trilha' }, { status: 403 });
      }
    }

    const { data: trail, error } = await admin
      .from('trails')
      .update({
        name,
        description: description || null,
        type,
        area_id: area_id || null,
        duration: duration || 0,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar trilha:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(trail);
  } catch (error) {
    console.error('Erro na API de trilhas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE — excluir trilha
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('role, area_id')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (userData.role !== 'admin' && userData.role !== 'gestor') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID da trilha é obrigatório' }, { status: 400 });
    }

    // Gestor só pode deletar trilhas da própria área
    if (userData.role === 'gestor') {
      const { data: existingTrail } = await admin
        .from('trails')
        .select('area_id')
        .eq('id', id)
        .single();

      if (!existingTrail || existingTrail.area_id !== userData.area_id) {
        return NextResponse.json({ error: 'Sem permissão para excluir esta trilha' }, { status: 403 });
      }
    }

    const { error } = await admin.from('trails').delete().eq('id', id);

    if (error) {
      console.error('Erro ao excluir trilha:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API de trilhas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
