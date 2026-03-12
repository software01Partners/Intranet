'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { CheckCircle2, XCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CertificateModal } from '@/components/certificate/CertificateModal';

export interface QuizFeedback {
  questionId: string;
  correct: boolean;
  correctAnswer: number;
  selectedAnswer: number | null;
}

export interface QuizResultData {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  minimumScore: number;
  feedback: QuizFeedback[];
  questions: Array<{ id: string; question: string; options: string[] }>;
  trailComplete?: boolean;
  trailId?: string;
}

interface QuizResultProps {
  result: QuizResultData;
  trailId: string;
  onRetry: () => void;
}

export function QuizResult({ result, trailId, onRetry }: QuizResultProps) {
  const router = useRouter();
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const handleBackToTrail = () => {
    router.push(`/trilhas/${trailId}`);
  };

  // Mostrar modal de certificado se passou e trilha foi concluída
  const shouldShowCertificate =
    result.passed && result.trailComplete && result.trailId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Resultado principal */}
      <div className="bg-[#13131A] border border-[#262630] rounded-xl p-8 mb-6 text-center">
        <div className="flex flex-col items-center gap-6">
          {/* ProgressRing com nota */}
          <div className="relative">
            <ProgressRing
              value={result.percentage}
              size={160}
              strokeWidth={12}
              color={result.passed ? '#10B981' : '#F59E0B'}
              backgroundColor="#262630"
              showLabel={false}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-[#E8E8ED]">
                {result.score}/{result.total}
              </div>
              <div className="text-lg text-[#8888A0] mt-1">
                {result.percentage.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Mensagem */}
          <div>
            {result.passed ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-[#10B981]">
                  <CheckCircle2 className="w-6 h-6" />
                  <h2 className="text-2xl font-semibold">
                    Parabéns! Você foi aprovado!
                  </h2>
                </div>
                <p className="text-[#8888A0]">
                  Você atingiu a nota mínima de {result.minimumScore}% e
                  concluiu este módulo com sucesso.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-[#F59E0B]">
                  <XCircle className="w-6 h-6" />
                  <h2 className="text-2xl font-semibold">
                    Nota mínima não atingida
                  </h2>
                </div>
                <p className="text-[#8888A0]">
                  Você precisa de pelo menos {result.minimumScore}% para ser
                  aprovado. Sua nota foi {result.percentage.toFixed(0)}%.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {result.passed ? (
          <>
            {shouldShowCertificate && (
              <Button
                variant="primary"
                onClick={() => setShowCertificateModal(true)}
                icon={CheckCircle2}
              >
                Ver Certificado
              </Button>
            )}
            <Button variant="primary" onClick={handleBackToTrail} icon={ArrowLeft}>
              Voltar para Trilha
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={onRetry} icon={RotateCcw}>
            Refazer Quiz
          </Button>
        )}
      </div>

      {/* Modal de certificado */}
      {shouldShowCertificate && result.trailId && (
        <CertificateModal
          isOpen={showCertificateModal}
          onClose={() => setShowCertificateModal(false)}
          trailId={result.trailId}
        />
      )}

      {/* Feedback das questões */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#E8E8ED] mb-4">
          Revisão das Questões
        </h3>

        {result.questions.map((question, questionIndex) => {
          const feedback = result.feedback.find(
            (f) => f.questionId === question.id
          );

          if (!feedback) return null;

          const isCorrect = feedback.correct;
          const correctOption = question.options[feedback.correctAnswer];
          const selectedOption =
            feedback.selectedAnswer !== null
              ? question.options[feedback.selectedAnswer]
              : null;

          return (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: questionIndex * 0.1 }}
              className={cn(
                'bg-[#13131A] border rounded-xl p-6',
                isCorrect
                  ? 'border-[#10B981]/30 bg-[#10B981]/5'
                  : 'border-[#EF4444]/30 bg-[#EF4444]/5'
              )}
            >
              <div className="flex items-start gap-3 mb-4">
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className="text-base font-medium text-[#E8E8ED] mb-2">
                    Questão {questionIndex + 1}
                  </h4>
                  <p className="text-[#8888A0] mb-4">{question.question}</p>

                  {/* Resposta correta */}
                  <div className="mb-2">
                    <span className="text-sm text-[#8888A0]">
                      Resposta correta:{' '}
                    </span>
                    <span className="text-sm font-medium text-[#10B981]">
                      {correctOption}
                    </span>
                  </div>

                  {/* Resposta selecionada (se errou) */}
                  {!isCorrect && selectedOption && (
                    <div>
                      <span className="text-sm text-[#8888A0]">
                        Sua resposta:{' '}
                      </span>
                      <span className="text-sm font-medium text-[#EF4444]">
                        {selectedOption}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
