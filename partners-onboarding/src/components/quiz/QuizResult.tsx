'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { CheckCircle2, XCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CertificateModal } from '@/components/certificate/CertificateModal';

export interface QuizResultData {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  minimumScore: number;
  attemptNumber: number;
  attemptsRemaining: number;
  blockedUntil: string | null;
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
      <div className="bg-white dark:bg-[#1A1A2E] border border-[#E2E5F1] dark:border-[#2D2D4A] rounded-2xl p-8 mb-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <ProgressRing
              value={result.percentage}
              size={160}
              strokeWidth={12}
              showLabel={false}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-[#1A1D2E] dark:text-[#E8E8ED]">
                {result.score}/{result.total}
              </div>
              <div className="text-lg text-[#6B7194] dark:text-[#8888A0] mt-1">
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
                <p className="text-[#6B7194] dark:text-[#8888A0]">
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
                <p className="text-[#6B7194] dark:text-[#8888A0]">
                  Você precisa de pelo menos {result.minimumScore}% para ser
                  aprovado. Sua nota foi {result.percentage.toFixed(0)}%.
                </p>
                {result.attemptsRemaining > 0 ? (
                  <p className="text-sm text-[#6B7194] dark:text-[#8888A0] mt-1">
                    Tentativas restantes: {result.attemptsRemaining}
                  </p>
                ) : result.blockedUntil ? (
                  <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400">
                      Quiz bloqueado por 3 dias. Tente novamente em{' '}
                      {new Date(result.blockedUntil).toLocaleDateString('pt-BR')}.
                    </p>
                  </div>
                ) : null}
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
        ) : result.attemptsRemaining > 0 ? (
          <>
            <Button variant="primary" onClick={onRetry} icon={RotateCcw}>
              Refazer Quiz
            </Button>
            <Button variant="secondary" onClick={handleBackToTrail} icon={ArrowLeft}>
              Voltar para Trilha
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={handleBackToTrail} icon={ArrowLeft}>
            Voltar para Trilha
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
    </motion.div>
  );
}
