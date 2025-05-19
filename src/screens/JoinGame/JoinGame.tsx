import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useGame } from "../../hooks/useGame";
import { useJoinGame } from "../../hooks/usePlayer";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export const JoinGame = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams();
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const { game, loading: loadingGame } = useGame(gameId);
  const { joinGame, loading: joining } = useJoinGame();
  
  const isCreator = location.state?.isCreator;
  const gameName = location.state?.gameName;

  const handleSubmit = async () => {
    if (!playerName.trim()) {
      setError("Por favor, introduce tu nombre");
      return;
    }
    
    try {
      await joinGame(gameId, playerName);
      navigate(`/game/${gameId}/lobby`, { state: { playerName: playerName.trim() } });
    } catch (err) {
      console.error('Error joining game:', err);
      setError("Error al unirse a la partida. Por favor, inténtalo de nuevo.");
    }
  };

  if (loadingGame || !game) {
    return (
      <div className="bg-[#e7e7e6] flex justify-center w-full min-h-screen">
        <div className="w-full max-w-[375px] h-[812px] flex items-center justify-center">
          <p className="[font-family:'Roboto',Helvetica] text-[#131309] text-lg">
            Cargando partida...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#e7e7e6] flex justify-center w-full min-h-screen">
      <div className="w-full max-w-[375px] h-[812px] flex flex-col items-center">
        <div className="flex flex-col items-center w-full max-w-[327px] gap-[72px] mt-[72px]">
          <h1 className="w-full [font-family:'Londrina_Solid',Helvetica] font-normal text-[#131309] text-[56px] text-center leading-[56px]">
            BULLSHIT
          </h1>

          <div className="w-full">
            <div className="bg-[#ffffff] rounded-[20px] shadow-md overflow-hidden" style={{backgroundColor: "#ffffff"}}>
              <div className="p-5 space-y-5">
                <h2 className="font-bold text-xl text-[#131309]">
                  {isCreator 
                    ? `Has creado la partida "${gameName}"`
                    : 'Unirse a la partida'}
                </h2>

                <p className="[font-family:'Roboto',Helvetica] font-normal text-[#131309] text-base leading-6">
                  ¿Cómo quieres que te llamen el resto de jugadores?
                </p>

                <div className="py-1">
                  <Input
                    className="h-12 px-3 py-2 rounded-[10px] border-[#13130940] [font-family:'Roboto',Helvetica] text-base"
                    placeholder="Tu nombre"
                    value={playerName}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      setError("");
                    }}
                  />
                  {error && (
                    <p className="text-[#cb1517] text-sm mt-2 [font-family:'Roboto',Helvetica]">
                      {error}
                    </p>
                  )}
                </div>

                <Button
                  className="w-full h-12 bg-[#804000] hover:bg-[#603000] rounded-[10px] font-bold text-base"
                  onClick={handleSubmit}
                  disabled={!playerName || joining}
                >
                  {isCreator ? 'Continuar' : 'Unirse'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};