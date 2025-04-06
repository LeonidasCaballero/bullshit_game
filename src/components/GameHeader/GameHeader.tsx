interface GameHeaderProps {
  inGame?: boolean;
}

export const GameHeader = ({ 
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
    </div>
  );
}; 