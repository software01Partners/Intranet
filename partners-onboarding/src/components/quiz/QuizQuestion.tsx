'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuizQuestionData {
  id: string;
  question: string;
  options: string[];
  originalIndices: number[];
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
          <span className="text-sm text-[#7A7468] dark:text-[#9A9590]">
            Questão {currentIndex + 1} de {totalQuestions}
          </span>
          <span className="text-sm text-[#7A7468] dark:text-[#9A9590]">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-2 bg-[#E0DCD6] dark:bg-[#333333] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#F5A623] dark:bg-[#D4A053] rounded-full"
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
          <div className="bg-white dark:bg-[#1A1A1A] border border-[#E0DCD6] dark:border-[#333333] rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#2D2A26] dark:text-[#E8E5E0] mb-6">
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
                      'bg-[#F5F3EF] dark:bg-[#1A1A1A] border-[#E0DCD6] dark:border-[#333333]',
                      'hover:border-[#F5A623]/50 dark:hover:border-[#D4A053]/50 hover:bg-[#EDE9E3] dark:hover:bg-[#222222]',
                      isSelected &&
                        'border-[#F5A623] dark:border-[#D4A053] bg-[#F5A623]/10 dark:bg-[#D4A053]/10 hover:bg-[#F5A623]/15 dark:hover:bg-[#D4A053]/15'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? 'border-[#F5A623] dark:border-[#D4A053] bg-[#F5A623]/20 dark:bg-[#D4A053]/20'
                            : 'border-[#E0DCD6] dark:border-[#333333] bg-[#E0DCD6] dark:bg-[#222222]'
                        )}
                      >
                        {isSelected && (
                          <div className="w-3 h-3 rounded-full bg-[#F5A623] dark:bg-[#D4A053]" />
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-base',
                          isSelected
                            ? 'text-[#2D2A26] dark:text-[#E8E5E0] font-medium'
                            : 'text-[#7A7468] dark:text-[#9A9590]'
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
