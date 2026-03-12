'use client';

import { useState } from 'react';
import { QuizQuestion, QuizQuestionData } from './QuizQuestion';
import { QuizResult, QuizResultData } from './QuizResult';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuizClientProps {
  moduleId: string;
  trailId: string;
  questions: QuizQuestionData[];
}

export function QuizClient({
  moduleId,
  trailId,
  questions,
}: QuizClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResultData | null>(null);

  const currentQuestion = questions[currentIndex];
  const selectedAnswer = answers[currentQuestion.id] ?? null;

  const handleSelectAnswer = (optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Preparar respostas no formato esperado pela API
      const answersArray = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      }));

      const response = await fetch('/api/quiz/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moduleId,
          answers: answersArray,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao corrigir quiz');
      }

      // Adicionar questões ao resultado para exibir feedback
      const resultWithQuestions: QuizResultData = {
        ...data,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options,
        })),
        trailComplete: data.trailComplete || false,
        trailId: data.trailId,
      };

      setResult(resultWithQuestions);
    } catch (error) {
      console.error('Erro ao enviar quiz:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao corrigir quiz. Tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setAnswers({});
    setResult(null);
  };

  // Se há resultado, mostrar QuizResult
  if (result) {
    return <QuizResult result={result} trailId={trailId} onRetry={handleRetry} />;
  }

  // Se está enviando, mostrar loading
  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 animate-spin text-[#6B2FA0] dark:text-[#8B5CF6] mb-4" />
        <p className="text-[#6B7194] dark:text-[#8888A0]">Corrigindo seu quiz...</p>
      </div>
    );
  }

  // Mostrar questão atual
  return (
    <QuizQuestion
      question={currentQuestion}
      currentIndex={currentIndex}
      totalQuestions={questions.length}
      selectedAnswer={selectedAnswer}
      onSelectAnswer={handleSelectAnswer}
      onPrevious={handlePrevious}
      onNext={handleNext}
      isLast={currentIndex === questions.length - 1}
    />
  );
}
