interface GameHeaderProps {
  roundNumber?: number;
  totalRounds?: number;
  inGame?: boolean;
}

export const GameHeader = ({ 
  roundNumber, 
  totalRounds = 7,
  inGame = false
}: GameHeaderProps): JSX.Element => {
  return (
    <div className="flex flex-col items-center">
      <h1 className={`
        [font-family:'Londrina_Solid'] 
        text-[#131309]
        ${inGame 
          ? 'text-[32px] mt-6' 
          : 'text-[56px] mt-12'
        }
      `}>
        BULLSHIT
      </h1>
      {roundNumber && (
        <p className="text-[#131309] text-lg mb-8">
          RONDA {roundNumber}/{totalRounds}
        </p>
      )}
    </div>
  );
}; 