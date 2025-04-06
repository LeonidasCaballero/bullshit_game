import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Game } from "../../lib/types";

export const ShareGame = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams();
  const [copied, setCopied] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSnackbar, setShowSnackbar] = useState<boolean>(false);
  
  const gameName = location.state?.gameName || "Partida";
  const gameUrl = `${window.location.origin}/game/${gameId}`;

  useEffect(() => {
    const fetchGame = async () => {
      if (!gameId) {
        setError("ID de partida no válido");
        return;
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(gameId)) {
        setError("ID de partida no válido");
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();
        
        if (fetchError) {
          console.error('Error fetching game:', fetchError);
          setError("No se pudo encontrar la partida");
          return;
        }
      
        if (data) {
          setGame(data);
        } else {
          setError("Partida no encontrada");
        }
      } catch (err) {
        console.error('Error:', err);
        setError("Error al cargar la partida");
      }
    };

    fetchGame();
  }, [gameId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      setShowSnackbar(true);
      setTimeout(() => {
        setShowSnackbar(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleContinue = () => {
    navigate(`/game/${gameId}`, { 
      state: { 
        gameName: location.state?.gameName 
      }
    });
  };

  if (error) {
    return (
      <div className="bg-[#e7e7e6] flex justify-center w-full min-h-screen">
        <div className="w-full max-w-[375px] h-[812px] flex flex-col items-center">
          <div className="flex flex-col items-center w-full max-w-[327px] gap-[72px] mt-[72px]">
            <h1 className="w-full [font-family:'Londrina_Solid',Helvetica] font-normal text-[#131309] text-[56px] text-center leading-[56px]">
              BULLSHIT
            </h1>

            <Card className="rounded-[20px] overflow-hidden border-none">
              <CardContent className="p-5 space-y-5">
                <h2 className="[font-family:'Roboto',Helvetica] font-bold text-[#131309] text-xl leading-[30px] mt-0">
                  Error
                </h2>
                <p className="[font-family:'Roboto',Helvetica] font-normal text-[#131309] text-base leading-6">
                  {error}
                </p>
                <Button
                  className="w-full h-12 bg-[#cb1517] hover:bg-[#b31315] rounded-[10px] [font-family:'Roboto',Helvetica] font-bold text-base"
                  onClick={() => navigate('/')}
                >
                  Volver al inicio
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#E7E7E6] flex justify-center w-full min-h-screen">
      <div className="w-full max-w-[375px] h-[812px] flex flex-col items-center">
        <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mt-12">
          BULLSHIT
        </h1>

        <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
          <h2 className="text-[#131309] text-xl font-bold mb-4">
            Comparte el enlace de la partida
          </h2>

          <p className="text-[#131309] text-base mb-6">
            Genial, ahora comparte este enlace con el resto de {game?.name} (por WhatsApp, por ejemplo).
          </p>

          <div className="space-y-4">
            <Input
              className="h-12 px-3 py-2 rounded-[10px] border-[#13130940] text-base"
              value={gameUrl}
              readOnly
            />

            <Button
              className="w-full h-12 bg-[#E7E7E6] hover:bg-[#d1d1d0] text-[#131309] rounded-[10px] font-bold text-base flex items-center justify-center gap-2"
              onClick={handleCopy}
            >
              <Copy className="w-5 h-5" />
              Copiar enlace
            </Button>

            <div className="flex gap-3">
              <Button
                className="flex-1 h-12 bg-[#E7E7E6] hover:bg-[#d1d1d0] text-[#131309] rounded-[10px] font-bold text-base"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Button
                className="flex-1 h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base"
                onClick={handleContinue}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </div>
      {showSnackbar && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-[#131309] text-white px-4 py-3 rounded-lg shadow-lg z-50">
          Link copiado bro
        </div>
      )}
    </div>
  );
};