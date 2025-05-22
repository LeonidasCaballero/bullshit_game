import React from 'react';
import { Button } from '../../../../components/ui/button'; // Path to Button component
import type { Player, Round } from '../../../../lib/types'; // Path to types

interface ModeratorWaitingViewProps {
  pendingPlayers: Player[];
  // roundId: string; // Only pass roundId instead of the whole round object - REMOVED as per analysis
  handleStartReadingAnswers: () => void;
  sendInsultBroadcast: () => Promise<void>; // Pass a function for sending insult
}

export const ModeratorWaitingView: React.FC<ModeratorWaitingViewProps> = ({
  pendingPlayers,
  // roundId, // roundId is not directly used in the template below, but was in the original onClick
  sendInsultBroadcast,
  handleStartReadingAnswers,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0">
      <div className="bg-white w-full px-6 pt-5 pb-8">
        <div className="max-w-[327px] mx-auto flex flex-col items-center">
          {pendingPlayers.length > 0 ? (
            <>
              <p className="text-[#131309] text-base sm:text-lg font-bold mb-4 whitespace-nowrap">
                Quedan por responder: {pendingPlayers.length > 0 ? (
                  <>
                    {pendingPlayers[0]?.name}
                    {pendingPlayers.length > 1 && (
                      <>
                        {pendingPlayers.length === 2 ? ' y ' : ', '}
                        {pendingPlayers[1]?.name}
                        {pendingPlayers.length > 2 && ` y ${pendingPlayers.length - 2} más`}
                      </>
                    )}
                  </>
                ) : (
                  "Nadie"
                )}
              </p>
              
              <Button
                className="w-full h-12 bg-[#131309] hover:bg-[#131309] rounded-[10px] font-bold text-base mb-6 relative overflow-hidden group"
                onClick={sendInsultBroadcast} // Use the passed function
              >
                {/* Efecto de borde de fuego */}
                <span className="absolute inset-0 rounded-[10px] border-2 border-[#FF5700] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                
                {/* Animación de brillo de fuego en los bordes */}
                <span className="absolute inset-0 rounded-[10px] shadow-[0_0_10px_3px_rgba(255,87,0,0.7)] opacity-0 group-hover:opacity-100 animate-fire-border"></span>
                
                <span className="relative z-10 text-white">Insulta al resto</span>
              </Button>
            </>
          ) : (
            <p className="text-[#131309] text-base mb-4">
              ¡Todas las respuestas recibidas!
            </p>
          )}
          
          <Button
            className="w-full h-12 bg-[#804000] hover:bg-[#603000] text-white rounded-[10px] font-bold text-base"
            onClick={handleStartReadingAnswers}
            disabled={pendingPlayers.length > 0}
          >
            Leer las respuestas
          </Button>
        </div>
      </div>
    </div>
  );
};
