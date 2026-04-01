import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit';

// GET — listar questões de um módulo
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const admin = createAdminClient();
    const { data: userData } = await admin.from('users').select('role').eq('id', authUser.id).single();
    if (!userData || (userData.role !== 'admin' && userData.role !== 'gestor')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const moduleId = new URL(request.url).searchParams.get('moduleId');
    if (!moduleId) return NextResponse.json({ error: 'moduleId obrigatório' }, { status: 400 });

    const { data, error } = await admin
      .from('quiz_questions')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Erro ao listar questões:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST — salvar questões (bulk save: delete removidas, upsert existentes/novas)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const admin = createAdminClient();
    const { data: userData } = await admin.from('users').select('name, role').eq('id', authUser.id).single();
    if (!userData || (userData.role !== 'admin' && userData.role !== 'gestor')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { moduleId, questions } = await request.json();
    if (!moduleId || !questions) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });

    // Buscar IDs existentes
    const { data: existing } = await admin
      .from('quiz_questions')
      .select('id')
      .eq('module_id', moduleId);

    const existingIds = (existing || []).map((q) => q.id);
    const savedIds = questions.map((q: { id?: string }) => q.id).filter(Boolean);
    const idsToDelete = existingIds.filter((id) => !savedIds.includes(id));

    // Deletar removidas
    if (idsToDelete.length > 0) {
      const { error } = await admin.from('quiz_questions').delete().in('id', idsToDelete);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Upsert questões
    for (const question of questions) {
      if (question.id) {
        const { error } = await admin
          .from('quiz_questions')
          .update({ question: question.question, options: question.options, correct_answer: question.correct_answer })
          .eq('id', question.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await admin
          .from('quiz_questions')
          .insert({ module_id: moduleId, question: question.question, options: question.options, correct_answer: question.correct_answer });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    await logAuditAction({
      userId: authUser.id, userName: userData.name,
      userRole: userData.role as 'admin' | 'gestor',
      action: 'update', entityType: 'quiz_question', entityId: moduleId,
      entityName: 'Quiz do módulo',
      details: { total_questoes: questions.length, deletadas: idsToDelete.length },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar questões:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
