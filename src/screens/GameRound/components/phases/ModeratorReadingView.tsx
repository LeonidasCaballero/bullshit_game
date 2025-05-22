import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { AnswerCardStack } from '../AnswerCardStack'; // Path to AnswerCardStack
import type { Question, AnswerOption, ExitingCard } from '../../../../lib/types'; // Path to types

interface ModeratorReadingViewProps {
  question: Question | null; // Question can be null initially
  shuffledAnswers: AnswerOption[];
  exitingCards: ExitingCard[];
  slideDirection: 'left' | 'right';
  currentAnswerIndex: number;
  handlePrevAnswer: () => void;
  handleNextAnswer: () => void;
}

export const ModeratorReadingView: React.FC<ModeratorReadingViewProps> = ({
  question,
  shuffledAnswers,
  exitingCards,
  slideDirection,
  currentAnswerIndex,
  handlePrevAnswer,
  handleNextAnswer,
}) => {
  if (!question || shuffledAnswers.length === 0) {
    // Or some other loading/empty state representation
    return <p>Loading question and answers...</p>; 
  }

  return (
    <>
      <div className="w-full max-w-[375px] mt-8 mb-28"> {/* mb-28 to leave space for fixed bottom nav */}
        <div className="text-center mb-6">
          <p className="text-[#131309] text-lg font-bold">
            {question.text.replace(/\.$/, '')}{' '}
            <span className="italic">{question.content}</span>?
          </p>
        </div>

        <div className="bg-[#131309] rounded-[20px] px-8 py-4 mb-6">
          <p className="text-white text-center">
            Lee las respuestas al resto de jugadores. Se han ordenado aleatoriamente junto a la respuesta real.
          </p>
        </div>

        <AnswerCardStack
          shuffledAnswers={shuffledAnswers}
          exitingCards={exitingCards}
          slideDirection={slideDirection}
          currentAnswerIndex={currentAnswerIndex}
        />
      </div>

      {/* Navegación inferior */}
      <div className="fixed bottom-0 left-0 right-0">
        <div className="bg-white w-full px-6 pt-5 pb-8">
          <div className="max-w-[327px] mx-auto flex gap-3">
            <button
              onClick={handlePrevAnswer}
              className="w-12 h-12 bg-[#E7E7E6] hover:bg-[#d1d1d0] rounded-[10px] flex items-center justify-center"
              disabled={currentAnswerIndex === 0}
            >
              <ChevronLeft className="w-6 h-6 text-[#131309]" />
            </button>
            <button
              onClick={handleNextAnswer}
              className="flex-1 h-12 bg-[#804000] hover:bg-[#603000] text-white rounded-[10px] font-bold text-base"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
