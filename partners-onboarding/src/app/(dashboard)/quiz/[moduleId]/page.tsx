import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Module, Trail, QuizQuestion } from '@/lib/types';
import { QuizClient } from '@/components/quiz/QuizClient';

async function getModuleData(moduleId: string) {
  const supabase = await createClient();

  // Buscar módulo com trilha associada
  const { data: moduleData, error: moduleError } = await supabase
    .from('modules')
    .select('*, trails(*)')
    .eq('id', moduleId)
    .eq('type', 'quiz')
    .single();

  if (moduleError || !moduleData) {
    return null;
  }

  const module = moduleData as Module & { trails: Trail };

  // Buscar questões do quiz (SEM correct_answer)
  const { data: questions, error: questionsError } = await supabase
    .from('quiz_questions')
    .select('id, question, options')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: true });

  if (questionsError || !questions || questions.length === 0) {
    return null;
  }

  // Embaralhar ordem das perguntas (Fisher-Yates shuffle)
  const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);

  // Embaralhar opções de cada pergunta e guardar mapeamento dos índices originais
  const sanitizedQuestions = shuffledQuestions.map((q) => {
    const options: string[] = Array.isArray(q.options) ? q.options : [];
    // Criar array de índices e embaralhar
    const indices = options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return {
      id: q.id,
      question: q.question,
      options: indices.map((i) => options[i]),
      originalIndices: indices,
    };
  });

  return {
    module: {
      id: module.id,
      trail_id: module.trail_id,
      title: module.title,
      type: module.type,
      content_url: module.content_url,
      duration: module.duration,
      sort_order: module.sort_order,
      created_at: module.created_at,
    },
    trail: module.trails as Trail,
    questions: sanitizedQuestions,
  };
}

interface PageProps {
  params: Promise<{ moduleId: string }>;
}

export default async function QuizPage({ params }: PageProps) {
  const { moduleId } = await params;

  const supabase = await createClient();

  // Verificar autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Buscar dados do módulo e questões
  const data = await getModuleData(moduleId);

  if (!data) {
    notFound();
  }

  // Bloquear acesso se o quiz já foi concluído
  const { data: existingProgress, error: progressError } = await supabase
    .from('user_progress')
    .select('completed')
    .eq('user_id', user.id)
    .eq('module_id', moduleId)
    .single();

  // Ignorar "no rows" (usuário nunca fez) e só logar erros reais
  if (progressError && progressError.code !== 'PGRST116') {
    console.error('Erro ao buscar progresso do quiz:', progressError);
  }

  if (existingProgress?.completed) {
    redirect(`/trilhas/${data.module.trail_id}?modulo=${moduleId}`);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#E8E8ED] mb-2">
          {data.module.title}
        </h1>
        <p className="text-[#8888A0]">
          Trilha: {data.trail.name}
        </p>
      </div>

      <QuizClient
        moduleId={moduleId}
        trailId={data.trail.id}
        questions={data.questions}
      />
    </div>
  );
}
