import React from 'react';
import type { Round, Player } from '../../../../lib/types'; // Adjust path as needed

interface CountdownViewProps {
  round: Round;
  moderator: Player;
  countdown: number;
  getCategoryIcon: () => string;
}

export const CountdownView: React.FC<CountdownViewProps> = ({
  round,
  moderator,
  countdown,
  getCategoryIcon,
}) => {
  return (
    <>
      <div className="w-full max-w-[327px] aspect-[1.6] bg-[#131309] rounded-[20px] mt-8 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[200px] font-bold text-[#131309] opacity-10 select-none">
            BULLSHIT
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="bg-[#9FFF00] w-20 h-20 rounded-[10px] flex items-center justify-center mb-4">
            <span className="text-4xl">{getCategoryIcon()}</span>
          </div>
          <p className="text-[#9FFF00] text-2xl font-bold uppercase">
            {round.category}
          </p>
        </div>
      </div>

      <p className="text-[#131309] text-xl mt-8">
        MODERADOR
      </p>

      <div className="mt-4 flex flex-col items-center">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
          style={{ backgroundColor: moderator.avatar_color }}
        >
          {moderator.name.charAt(0).toUpperCase()}
        </div>
        <p className="text-[#131309] text-xl mt-2">{moderator.name}</p>
      </div>

      <div className="fixed bottom-0 left-0 right-0">
        <div className="bg-white w-full px-6 pt-5 pb-8">
          <div className="max-w-[327px] mx-auto">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold mb-4">{countdown}</span>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#CB1517] transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
