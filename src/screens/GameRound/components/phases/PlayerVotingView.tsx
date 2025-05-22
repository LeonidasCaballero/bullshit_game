import React from 'react';
import { Button } from '../../../../components/ui/button'; // Path to Button
import type { Question, AnswerOption, Player } from '../../../../lib/types'; // Path to types

interface PlayerVotingViewProps {
  question: Question | null;
  shuffledAnswers: AnswerOption[];
  currentPlayerId: string | undefined; // From currentPlayer?.id
  selectedAnswerContent: string | null; // Previously selectedVote
  hasVoted: boolean;
  allPlayersVoted: boolean;
  onSelectAnswer: (answerContent: string) => void; // To set the selectedAnswerContent in parent
  onConfirmVote: () => void; // To submit the vote
}

export const PlayerVotingView: React.FC<PlayerVotingViewProps> = ({
  question,
  shuffledAnswers,
  currentPlayerId,
  selectedAnswerContent,
  hasVoted,
  allPlayersVoted,
  onSelectAnswer,
  onConfirmVote,
}) => {
  if (!question) {
    return <p>Loading question...</p>; // Or some other loading/empty state
  }

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
      <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-6">
        BULLSHIT
      </h1>
      
      <div className="w-full max-w-[375px] mt-4 mb-28 px-4"> {/* mb-28 for fixed bottom elements */}
        <div className="text-center mb-4">
          <p className="text-[#131309] text-sm">
            <span className="font-medium">{question.text.replace(/\.$/, '')}</span>{' '}
            <span className="italic">{question.content}</span>?
          </p>
        </div>

        <div className="bg-[#131309] rounded-[20px] px-6 py-4 mb-6">
          <p className="text-white text-center font-medium">
            Selecciona la respuesta real
          </p>
        </div>

        <div className="space-y-3">
          {shuffledAnswers.map((answer, index) => {
            const isOwnAnswer = answer.playerId === currentPlayerId;
            return (
              <div
                key={index}
                className={`w-full p-6 bg-white rounded-[20px] mb-4 border-2 transition-all
                  ${selectedAnswerContent === answer.content ? 'border-[#000000]' : 'border-transparent'}
                  ${isOwnAnswer ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}
                `}
                onClick={() => !hasVoted && !isOwnAnswer && onSelectAnswer(answer.content)}
              >
                <p className="text-[#131309] text-lg">
                  {answer.content}
                  {isOwnAnswer && <span className="ml-2 text-[#804000] font-medium">(Tu respuesta)</span>}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {!hasVoted && selectedAnswerContent && (
        <div className="fixed bottom-0 left-0 right-0">
          <div className="bg-white w-full px-6 pt-5 pb-8">
            <div className="max-w-[327px] mx-auto">
              <Button
                className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base"
                onClick={onConfirmVote}
                disabled={!selectedAnswerContent} // Button is enabled if an answer is selected
              >
                Confirmar voto
              </Button>
            </div>
          </div>
        </div>
      )}

      {hasVoted && (
        <div className="fixed bottom-0 left-0 right-0">
          <div className="bg-white w-full px-6 pt-5 pb-8">
            <div className="max-w-[327px] mx-auto flex flex-col items-center">
              <div className="w-16 h-16 bg-[#131309] rounded-full flex items-center justify-center mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="#9FFF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-[#131309] text-2xl font-bold mb-4 text-center">
                ¡Voto registrado!
              </p>
              <p className="text-[#131309] text-base text-center">
                {allPlayersVoted 
                  ? "Todos han votado. Veremos los resultados pronto." 
                  : "Esperando a que los demás voten..."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
