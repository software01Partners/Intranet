'use client';

import { useState, useRef } from 'react';
import { QuizQuestion, QuizQuestionData } from './QuizQuestion';
import { QuizResult, QuizResultData } from './QuizResult';
import { Button } from '@/components/ui/Button';
import { Loader2, Lock, Clock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface QuizClientProps {
  moduleId: string;
  trailId: string;
  questions: QuizQuestionData[];
  attemptsUsed: number;
  attemptsRemaining: number;
  blockedUntil: string | null;
  cycle: number;
}

export function QuizClient({
  moduleId,
  trailId,
  questions,
  attemptsUsed: initialAttemptsUsed,
  attemptsRemaining: initialAttemptsRemaining,
  blockedUntil: initialBlockedUntil,
  cycle: initialCycle,
}: QuizClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [displayAnswers, setDisplayAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResultData | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const [attemptInfo, setAttemptInfo] = useState({
    attemptsUsed: initialAttemptsUsed,
    attemptsRemaining: initialAttemptsRemaining,
    blockedUntil: initialBlockedUntil,
    cycle: initialCycle,
  });

  const currentQuestion = questions[currentIndex];
  const selectedAnswer = displayAnswers[currentQuestion.id] ?? null;

  const handleSelectAnswer = (optionIndex: number) => {
    setDisplayAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
    const originalIndex = currentQuestion.originalIndices[optionIndex];
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: originalIndex,
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
      const answersArray = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      }));

      const response = await fetch('/api/quiz/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId,
          answers: answersArray,
          time_spent: Math.round((Date.now() - startTimeRef.current) / 1000),
        }),
      });

      const data = await response.json();

      if (response.status === 423) {
        setAttemptInfo({
          attemptsUsed: data.attemptsUsed,
          attemptsRemaining: data.attemptsRemaining,
          blockedUntil: data.blocked_until,
          cycle: attemptInfo.cycle,
        });
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao corrigir quiz');
      }

      setAttemptInfo({
        attemptsUsed: data.attemptNumber,
        attemptsRemaining: data.attemptsRemaining,
        blockedUntil: data.blockedUntil,
        cycle: data.cycle,
      });

      const resultData: QuizResultData = {
        score: data.score,
        total: data.total,
        percentage: data.percentage,
        passed: data.passed,
        minimumScore: data.minimumScore,
        attemptNumber: data.attemptNumber,
        attemptsRemaining: data.attemptsRemaining,
        blockedUntil: data.blockedUntil,
        trailComplete: data.trailComplete || false,
        trailId: data.trailId,
      };

      setResult(resultData);
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
    setDisplayAnswers({});
    setResult(null);
    startTimeRef.current = Date.now();
  };

  // Se bloqueado, mostrar tela de bloqueio
  if (attemptInfo.blockedUntil && new Date(attemptInfo.blockedUntil) > new Date()) {
    const blockedDate = new Date(attemptInfo.blockedUntil);
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-[#1A1D2E] dark:text-[#E8E8ED] mb-3">
          Quiz Bloqueado
        </h2>
        <p className="text-[#6B7194] dark:text-[#8888A0] mb-2 max-w-md">
          Você utilizou todas as 3 tentativas deste ciclo.
          O quiz será desbloqueado em:
        </p>
        <div className="flex items-center gap-2 text-[#F59E0B] font-semibold text-lg mt-2">
          <Clock className="w-5 h-5" />
          <span>
            {blockedDate.toLocaleDateString('pt-BR')} às{' '}
            {blockedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <Button
          variant="primary"
          onClick={() => window.location.href = `/trilhas/${trailId}`}
          className="mt-8"
          icon={ArrowLeft}
        >
          Voltar para Trilha
        </Button>
      </div>
    );
  }

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
    <div>
      {/* Indicador de tentativas */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm text-[#6B7194] dark:text-[#8888A0]">
          Tentativa {attemptInfo.attemptsUsed + 1} de 3
        </span>
      </div>
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
    </div>
  );
}
