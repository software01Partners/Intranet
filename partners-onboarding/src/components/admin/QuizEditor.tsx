'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Plus, Trash2, Save } from 'lucide-react';
import type { QuizQuestion } from '@/lib/types';

interface QuestionForm {
  id?: string;
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
}

interface QuizEditorProps {
  moduleId: string;
  onClose: () => void;
}

export function QuizEditor({ moduleId, onClose }: QuizEditorProps) {
  const supabase = createClient();
  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Carregar questões existentes
  useEffect(() => {
    async function loadQuestions() {
      try {
        const { data, error } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('module_id', moduleId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const formattedQuestions: QuestionForm[] = data.map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options as [string, string, string, string],
            correctAnswer: q.correct_answer,
          }));
          setQuestions(formattedQuestions);
        } else {
          // Se não houver questões, criar uma vazia
          setQuestions([
            {
              question: '',
              options: ['', '', '', ''],
              correctAnswer: 0,
            },
          ]);
        }
      } catch (error) {
        console.error('Erro ao carregar questões:', error);
        toast.error('Erro ao carregar questões', {
          description: error instanceof Error ? error.message : 'Erro inesperado',
        });
        // Criar questão vazia mesmo em caso de erro
        setQuestions([
          {
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error('É necessário ter pelo menos uma questão');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuestionForm, value: any) => {
    const updated = [...questions];
    if (field === 'question') {
      updated[index].question = value;
    } else if (field === 'options') {
      updated[index].options = value;
    } else if (field === 'correctAnswer') {
      updated[index].correctAnswer = value;
    }
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const handleSave = async () => {
    // Validação: mínimo 3 questões
    const validQuestions = questions.filter(
      (q) => q.question.trim() && q.options.every((opt) => opt.trim())
    );

    if (validQuestions.length < 3) {
      toast.error('Validação', {
        description: 'É necessário ter pelo menos 3 questões válidas para salvar',
      });
      return;
    }

    // Validar cada questão
    for (let i = 0; i < validQuestions.length; i++) {
      const q = validQuestions[i];
      if (!q.question.trim()) {
        toast.error(`Questão ${i + 1} está sem texto`);
        return;
      }
      if (q.options.some((opt) => !opt.trim())) {
        toast.error(`Questão ${i + 1} tem opções vazias`);
        return;
      }
      if (q.correctAnswer < 0 || q.correctAnswer > 3) {
        toast.error(`Questão ${i + 1} tem resposta correta inválida`);
        return;
      }
    }

    try {
      setSaving(true);

      // Preparar dados para upsert
      const questionsToSave = validQuestions.map((q) => ({
        id: q.id || undefined,
        module_id: moduleId,
        question: q.question.trim(),
        options: q.options.map((opt) => opt.trim()),
        correct_answer: q.correctAnswer,
      }));

      // Buscar IDs das questões existentes para deletar as que foram removidas
      const { data: existingQuestions } = await supabase
        .from('quiz_questions')
        .select('id')
        .eq('module_id', moduleId);

      const existingIds = existingQuestions?.map((q) => q.id) || [];
      const savedIds = questionsToSave.map((q) => q.id).filter((id): id is string => !!id);
      const idsToDelete = existingIds.filter((id) => !savedIds.includes(id));

      // Deletar questões removidas
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('quiz_questions')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) throw deleteError;
      }

      // Upsert questões (insert ou update)
      for (const question of questionsToSave) {
        if (question.id) {
          // Update
          const { error } = await supabase
            .from('quiz_questions')
            .update({
              question: question.question,
              options: question.options,
              correct_answer: question.correct_answer,
            })
            .eq('id', question.id);

          if (error) throw error;
        } else {
          // Insert
          const { error } = await supabase.from('quiz_questions').insert({
            module_id: question.module_id,
            question: question.question,
            options: question.options,
            correct_answer: question.correct_answer,
          });

          if (error) throw error;
        }
      }

      toast.success('Questões salvas com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar questões:', error);
      toast.error('Erro ao salvar questões', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#8888A0]">Carregando questões...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-[#E8E8ED]">Editor de Questões</h3>
          <p className="text-sm text-[#8888A0] mt-1">
            {questions.length} questão{questions.length !== 1 ? 'ões' : ''} cadastrada
            {questions.length !== 1 ? 's' : ''} (mínimo: 3)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving} icon={Save}>
            Salvar Todas
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question, questionIndex) => (
          <Card key={questionIndex}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <Badge color="blue">Questão {questionIndex + 1}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(questionIndex)}
                  icon={Trash2}
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                  disabled={questions.length <= 1}
                >
                  Excluir
                </Button>
              </div>

              <div className="space-y-4">
                <Textarea
                  label="Texto da questão"
                  value={question.question}
                  onChange={(e) =>
                    updateQuestion(questionIndex, 'question', e.target.value)
                  }
                  placeholder="Digite a pergunta..."
                  rows={3}
                />

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-[#E8E8ED]">
                    Opções de resposta
                  </label>
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`correct-${questionIndex}`}
                        checked={question.correctAnswer === optionIndex}
                        onChange={() =>
                          updateQuestion(questionIndex, 'correctAnswer', optionIndex)
                        }
                        className="w-4 h-4 text-[#E8580C] bg-[#0A0A0F] border-[#262630] focus:ring-[#E8580C]"
                      />
                      <Input
                        value={option}
                        onChange={(e) =>
                          updateOption(questionIndex, optionIndex, e.target.value)
                        }
                        placeholder={`Opção ${optionIndex + 1}`}
                        className="flex-1"
                      />
                      {question.correctAnswer === optionIndex && (
                        <Badge color="green" variant="soft" className="text-xs">
                          Correta
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button onClick={addQuestion} icon={Plus} variant="secondary">
          Adicionar Questão
        </Button>
      </div>
    </div>
  );
}
