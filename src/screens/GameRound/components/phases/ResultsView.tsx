import React from 'react';
import type { Question, PlayerScoreData } from '../../../../lib/types'; // Path to types

interface ResultsViewProps {
  question: Question | null;
  // `players`, `votes`, `roundModeratorId`, `currentPlayerId` are used by parent to create `sortedScores`
  sortedScores: PlayerScoreData[]; // Pre-calculated and sorted scores
  resultsCountdown: number;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  question,
  sortedScores,
  resultsCountdown,
}) => {
  if (!question) {
    return <p>Loading results...</p>; // Or some other loading/empty state
  }

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
      <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-6">
        BULLSHIT
      </h1>
      <div className="w-full max-w-md px-4 mt-8 mb-28"> {/* mb-28 for fixed bottom countdown */}
        <div className="bg-[#131309] rounded-[20px] p-6 mb-4">
          <h2 className="text-white text-xl font-bold text-center mb-2">
            Resultados
          </h2>
          <p className="text-white text-center">
            {question.text}: <span className="font-bold">{question.content}</span>
          </p>
        </div>
        <div className="space-y-4">
          {sortedScores.map((scoreData) => {
            let borderStyle = '';
            if (scoreData.isCurrentPlayer && !scoreData.isModerator) {
              borderStyle = scoreData.voteIsCorrect ? 'border-2 border-[#9FFF00]' : (scoreData.voteIsCorrect === false ? 'border-2 border-[#CB1517]' : '');
            }

            return (
              <div 
                key={scoreData.playerId} 
                className={`rounded-[20px] p-4 shadow-md ${
                  scoreData.isModerator 
                    ? 'bg-[#F0F0E8] border-2 border-[#131309]' 
                    : scoreData.isCurrentPlayer 
                      ? `bg-white ${borderStyle}` 
                      : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${scoreData.isModerator ? 'ring-2 ring-[#131309]' : ''}`}
                    style={{ backgroundColor: scoreData.avatar_color }}
                  >
                    {scoreData.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{scoreData.name}</p>
                      {scoreData.isModerator && (
                        <span className="bg-[#131309] text-white text-xs px-2 py-1 rounded-full">
                          Moderador
                        </span>
                      )}
                      {scoreData.isCurrentPlayer && (
                        <span className="bg-[#E7E7E6] text-[#131309] text-xs px-2 py-1 rounded-full">
                          Tú
                        </span>
                      )}
                    </div>
                    {!scoreData.isModerator && (
                      <p className="text-sm">
                        {scoreData.votedAnswer
                          ? (scoreData.voteIsCorrect ? '✅ Votó correctamente' : '❌ Engañado')
                          : '❌ No votó'}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="bg-[#9FFF00] px-3 py-1 rounded-full font-bold">
                      +{scoreData.points} pts
                    </div>
                  </div>
                </div>
                {scoreData.playerAnswer && !scoreData.isModerator && (
                  <div className="bg-gray-100 p-3 rounded-lg mb-2 mt-1">
                    <p className="text-sm text-gray-700 font-medium mb-1">Su respuesta:</p>
                    <p className="text-sm font-italic">"{scoreData.playerAnswer}"</p>
                  </div>
                )}
                
                {scoreData.details.length > 0 && (
                  <div className="text-sm space-y-1">
                    {scoreData.details.map((detail, i) => (
                      <p key={i}>{detail}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0">
        <div className="bg-white w-full px-6 pt-5 pb-8">
          <div className="max-w-[327px] mx-auto flex flex-col items-center">
            <p className="text-[#131309] text-xl font-bold mb-4 text-center">
              Siguiente ronda en {resultsCountdown}
            </p>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#CB1517] transition-all duration-1000 ease-linear"
                style={{ width: `${(resultsCountdown / 20) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
