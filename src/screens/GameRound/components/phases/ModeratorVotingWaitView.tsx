import React from 'react';
import { Button } from '../../../../components/ui/button'; // Path to Button
import type { Player } from '../../../../lib/types'; // Path to types

interface ModeratorVotingWaitViewProps {
  totalPlayersToVote: number;
  votedPlayersCount: number;
  pendingToVotePlayers: Player[];
  onRevealResults: () => void; // Changed from handleRevealResults for clarity
}

export const ModeratorVotingWaitView: React.FC<ModeratorVotingWaitViewProps> = ({
  totalPlayersToVote,
  votedPlayersCount,
  pendingToVotePlayers,
  onRevealResults,
}) => {
  const allVoted = votedPlayersCount === totalPlayersToVote;
  const jugadoresText = totalPlayersToVote === 1 ? "jugador" : "jugadores";

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
      <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-6">
        BULLSHIT
      </h1>
      
      <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
        <p className="text-[#131309] text-xl text-center">
          {allVoted 
            ? "¡Ya han votado todos los jugadores!" 
            : `Han votado ${votedPlayersCount} de ${totalPlayersToVote} ${jugadoresText}`}
        </p>

        {!allVoted && pendingToVotePlayers.length > 0 && (
          <div className="mt-6">
            <p className="text-[#131309] text-base font-bold mb-3">
              Falta por votar:
            </p>
            <div className="space-y-2">
              {pendingToVotePlayers.map(player => (
                <div 
                  key={player.id}
                  className="flex items-center gap-3 p-3 bg-[#E7E7E6] rounded-[10px]"
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-base"
                    style={{ backgroundColor: player.avatar_color }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 font-normal text-base text-[#131309]">
                    {player.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {allVoted && (
          <Button
            onClick={onRevealResults}
            className="w-full mt-6 h-12 bg-[#804000] hover:bg-[#603000] text-white rounded-[10px] font-bold text-base transition-colors"
            // Original had p-4, now using h-12 for consistency with other buttons
          >
            Revelar resultados
          </Button>
        )}
      </div>
    </div>
  );
};
