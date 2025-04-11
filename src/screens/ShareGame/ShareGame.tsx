import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Game } from "../../lib/types";

export const ShareGame = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams();
  const [copied, setCopied] = useState(false);
  const [, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  
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

  useEffect(() => {
    console.log("Estado de navegación en ShareGame:", location.state);
  }, [location.state]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(gameUrl).then(() => {
      setCopied(true);
      // Mostrar toast
      setShowToast(true);
      // Ocultar toast después de 3 segundos
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
      // Restaurar el estado del botón después de 2 segundos
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  const handleContinue = () => {
    console.log("Navegando a Join como creador desde ShareGame");
    navigate(`/game/${gameId}`, {
      state: {
        isCreator: true,
        gameName: gameName || "Partida"
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
    <div className="min-h-screen bg-[#E7E7E6] flex flex-col items-center">
      <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mt-12">
        BULLSHIT
      </h1>

      {/* Tarjeta personalizada con fondo blanco forzado */}
      <div className="w-full max-w-[327px] mt-8 bg-[#ffffff] rounded-[20px] shadow-md overflow-hidden" style={{backgroundColor: "#ffffff"}}>
        <div className="p-5 space-y-5">
          <h2 className="font-bold text-xl text-[#131309]">
            ¡{gameName} creado!
          </h2>
          
          <p className="text-[#131309] text-base">
            Comparte este enlace con el resto de los jugadores para que se unan a la partida.
          </p>
          
          <div className="bg-[#F3F3F3] rounded-[10px] flex items-center px-3 py-2.5">
            <span className="flex-1 truncate text-[#131309] text-sm">
              {gameUrl}
            </span>
            <Button
              className={`w-8 h-8 p-0 rounded-full ml-2 ${
                copied
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-[#CB1517] hover:bg-[#B31315]"
              }`}
              onClick={handleCopyLink}
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-white" />
              ) : (
                <Copy className="w-4 h-4 text-white" />
              )}
            </Button>
          </div>
          
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

      {/* Toast de confirmación */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fadeInUp">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">¡Link copiado bro!</span>
        </div>
      )}
    </div>
  );
};