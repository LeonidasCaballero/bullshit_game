import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export const Frame = (): JSX.Element => {
  const navigate = useNavigate();
  const [gameName, setGameName] = useState("");
  const [error, setError] = useState("");

  const gameData = {
    title: "BULLSHIT",
    cardTitle: "Comienza una partida",
    instructions:
      "Antes, da un nombre al grupo de desalmados que vais a jugar (por ejemplo, Los Cuñis o Las Sabandijas de Carabanchel).",
    inputPlaceholder: "Nombre del grupo de jugadores",
    buttonText: "Siguiente",
  };

  const handleCreateGame = async () => {
    if (!gameName.trim()) {
      setError("Por favor, introduce un nombre para el grupo");
      return;
    }

    try {
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert([{ name: gameName }])
        .select()
        .single();

      if (gameError) throw gameError;
      
      navigate(`/share/${game.id}`, { state: { gameName } });

    } catch (err) {
      console.error('Error creating game:', err);
      setError("Error al crear la partida. Por favor, inténtalo de nuevo.");
    }
  };

  return (
    <div className="bg-[#E7E7E6] flex justify-center w-full min-h-screen">
      <div className="w-full max-w-[375px] h-[812px] flex flex-col items-center">
        <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mt-12">
          BULLSHIT
        </h1>

        <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
          <h2 className="text-[#131309] text-xl font-bold mb-4">
            Comienza una partida
          </h2>

          <p className="text-[#131309] text-base mb-6">
            Antes, da un nombre al grupo de desalmados que vais a jugar (por ejemplo, Los Cuñis o Las Sabandijas de Carabanchel).
          </p>

          <div className="space-y-4">
            <Input
              className="h-12 px-3 py-2 rounded-[10px] border-[#13130940] text-base"
              placeholder="Nombre del grupo de jugadores"
              value={gameName}
              onChange={(e) => {
                setGameName(e.target.value);
                setError("");
              }}
            />
            {error && (
              <p className="text-[#CB1517] text-sm">
                {error}
              </p>
            )}
            <Button
              className="w-full h-12 bg-[#804000] hover:bg-[#603000] rounded-[10px] font-bold text-base"
              onClick={handleCreateGame}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};