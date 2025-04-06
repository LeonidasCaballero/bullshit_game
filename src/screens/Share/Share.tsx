import { Button } from "../../components/ui/button";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Share2 } from "lucide-react";

export const Share = (): JSX.Element => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState<string>("");
  const [showSnackbar, setShowSnackbar] = useState<boolean>(false);
  
  useEffect(() => {
    if (!gameId) return;
    
    const fetchGameCode = async () => {
      const { data } = await supabase
        .from('games')
        .select('code')
        .eq('id', gameId)
        .single();
        
      if (data) {
        setGameCode(data.code);
      }
    };
    
    fetchGameCode();
  }, [gameId]);
  
  const handleCopyLink = () => {
    const gameUrl = `${window.location.origin}/join/${gameCode}`;
    navigator.clipboard.writeText(gameUrl);
    
    // Mostrar el snackbar
    setShowSnackbar(true);
    
    // Ocultar el snackbar después de 3 segundos
    setTimeout(() => {
      setShowSnackbar(false);
    }, 3000);
  };
  
  const handleJoinGame = () => {
    navigate(`/game/${gameId}/lobby`);
  };
  
  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen p-4">
      <div className="flex flex-col items-center justify-center flex-grow">
        <div className="flex flex-col items-center bg-white rounded-[20px] p-6 w-full max-w-sm">
          <div className="w-16 h-16 bg-[#131309] rounded-full flex items-center justify-center mb-4">
            <Share2 size={32} className="text-white" />
          </div>
          
          <h1 className="text-[#131309] text-2xl font-bold mb-2">
            ¡Invita a tus amigos!
          </h1>
          
          <p className="text-[#131309] text-center mb-8">
            Comparte el enlace para que tus amigos puedan unirse a la partida
          </p>
          
          <Button
            onClick={handleCopyLink}
            className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base mb-3"
          >
            Copiar enlace
          </Button>
          
          <Button
            onClick={handleJoinGame}
            className="w-full h-12 bg-transparent text-[#131309] border border-[#131309] hover:bg-[#13130910] rounded-[10px] font-bold text-base"
          >
            Entrar al lobby
          </Button>
        </div>
      </div>
      
      {/* Snackbar / Toast notification */}
      {showSnackbar && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-[#131309] text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in">
          Link copiado bro
        </div>
      )}
    </div>
  );
}; 