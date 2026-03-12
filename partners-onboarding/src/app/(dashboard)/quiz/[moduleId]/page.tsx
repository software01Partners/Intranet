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

  // Garantir que options seja um array de strings (sem is_correct)
  const sanitizedQuestions = questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: Array.isArray(q.options) ? q.options : [],
  }));

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
