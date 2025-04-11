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
      
      {/* Mostrar información de la ronda si estamos en el juego y hay un número de ronda */}
      {inGame && roundNumber && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-[#131309] opacity-60">
            Ronda {roundNumber} de {totalRounds}
          </span>
        </div>
      )}
    </div>
  );
}; 