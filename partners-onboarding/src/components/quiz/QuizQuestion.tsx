'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuizQuestionData {
  id: string;
  question: string;
  options: string[];
}

interface QuizQuestionProps {
  question: QuizQuestionData;
  currentIndex: number;
  totalQuestions: number;
  selectedAnswer: number | null;
  onSelectAnswer: (optionIndex: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  isLast: boolean;
}

export function QuizQuestion({
  question,
  currentIndex,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  onNext,
  onPrevious,
  isLast,
}: QuizQuestionProps) {
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Barra de progresso */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#8888A0]">
            Questão {currentIndex + 1} de {totalQuestions}
          </span>
          <span className="text-sm text-[#8888A0]">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-2 bg-[#262630] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#E8580C] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Questão */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-[#13131A] border border-[#262630] rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#E8E8ED] mb-6">
              {question.question}
            </h2>

            {/* Opções */}
            <div className="space-y-3">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === index;

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onSelectAnswer(index)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border transition-all duration-200',
                      'bg-[#13131A] border-[#262630]',
                      'hover:border-[#E8580C]/50 hover:bg-[#1A1A24]',
                      isSelected &&
                        'border-[#E8580C] bg-[#E8580C]/10 hover:bg-[#E8580C]/15'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? 'border-[#E8580C] bg-[#E8580C]/20'
                            : 'border-[#262630] bg-[#1A1A24]'
                        )}
                      >
                        {isSelected && (
                          <div className="w-3 h-3 rounded-full bg-[#E8580C]" />
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-base',
                          isSelected
                            ? 'text-[#E8E8ED] font-medium'
                            : 'text-[#8888A0]'
                        )}
                      >
                        {option}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Botões de navegação */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={onPrevious}
          disabled={currentIndex === 0}
          icon={ChevronLeft}
        >
          Anterior
        </Button>

        <Button
          variant="primary"
          onClick={onNext}
          disabled={selectedAnswer === null}
          icon={ChevronRight}
          iconPosition="right"
        >
          {isLast ? 'Finalizar' : 'Próxima'}
        </Button>
      </div>
    </div>
  );
}
