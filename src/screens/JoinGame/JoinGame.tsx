import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
<<<<<<< HEAD
import { useState, useEffect } from "react";
=======
import React, { useState, useEffect } from "react";
>>>>>>> 4aae844 (Corregir error de tipado con useLocation en JoinGame)
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import type { Game } from "../../lib/types";

interface LocationState {
  isCreator?: boolean;
  gameName?: string;
}

export const JoinGame = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams();
  const location = useLocation() as { state: LocationState };
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const [game, setGame] = useState<Game | null>(null);
<<<<<<< HEAD

=======
  
>>>>>>> 4aae844 (Corregir error de tipado con useLocation en JoinGame)
  const isCreator = location.state?.isCreator;
  const gameName = location.state?.gameName;

  useEffect(() => {
    const fetchGame = async () => {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();
      
      if (data) {
        setGame(data);
      }
    };

    fetchGame();
  }, [gameId]);

  const handleSubmit = async () => {
    if (!playerName.trim()) {
      setError("Por favor, introduce tu nombre");
      return;
    }
    
    try {
      // Crear un ID aleatorio para el jugador
      const playerId = crypto.randomUUID();
      
      // Generar un color aleatorio para el avatar
      const getRandomColor = () => {
        const colors = [
          "#F44336", "#E91E63", "#9C27B0", "#673AB7", 
          "#3F51B5", "#2196F3", "#03A9F4", "#00BCD4", 
          "#009688", "#4CAF50", "#8BC34A", "#CDDC39"
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      };
      
      const { error: playerError } = await supabase
        .from('players')
        .insert([
          { 
            id: playerId,
            game_id: gameId, 
            name: playerName.trim(),
            avatar_color: getRandomColor()
          }
        ]);

      if (playerError) throw playerError;
      
      // Guardar datos del jugador en localStorage para identificación simple
      localStorage.setItem('bullshit_player_id', playerId);
      localStorage.setItem('bullshit_player_name', playerName);
      
      navigate(`/game/${gameId}/lobby`, { 
        state: { 
          playerName: playerName.trim()
        } 
      });
    } catch (err) {
      console.error('Error joining game:', err);
      setError("Error al unirse a la partida. Por favor, inténtalo de nuevo.");
    }
  };

  if (!game) {
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
<<<<<<< HEAD
            <Card className="rounded-[20px] overflow-hidden border-none bg-white">
              <CardContent className="p-5 space-y-5">
=======
            <div className="bg-[#ffffff] rounded-[20px] shadow-md overflow-hidden" style={{backgroundColor: "#ffffff"}}>
              <div className="p-5 space-y-5">
>>>>>>> fix/question-data-issue
                <h2 className="font-bold text-xl text-[#131309]">
                  {isCreator 
                    ? `Has creado la partida "${gameName || game.name}"`
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
                  className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base"
                  onClick={handleSubmit}
                  disabled={!playerName}
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