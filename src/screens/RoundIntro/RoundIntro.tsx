import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Player, Round } from "../../lib/types";

export const RoundIntro = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { gameId } = useParams();
  const [countdown, setCountdown] = useState<number>(10);
  const [moderator, setModerator] = useState<Player | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRoundInfo = async () => {
      try {
        // Obtener la ronda activa
        const { data: activeRound } = await supabase
          .from('rounds')
          .select('*')
          .eq('game_id', gameId)
          .eq('active', true)
          .single();

        if (!activeRound) return;
        setRound(activeRound);

        // Obtener el moderador
        const { data: moderatorData } = await supabase
          .from('players')
          .select('*')
          .eq('id', activeRound.moderator_id)
          .single();

        if (moderatorData) {
          setModerator(moderatorData);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading round info:', err);
      }
    };

    loadRoundInfo();
  }, [gameId]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }

    if (countdown === 0 && round) {
      navigate(`/game/${gameId}/round`, {
        state: { 
          playerName: location.state?.playerName,
          roundNumber: round?.number,
          roundId: round?.id,
          moderatorId: round?.moderator_id,
          category: round?.category
        }
      });
    }
  }, [countdown, gameId, navigate, location.state?.playerName, round]);

  if (isLoading || !round || !moderator) {
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center justify-center">
        <p className="text-[#131309] text-lg">Cargando...</p>
      </div>
    );
  }

  const getCategoryEmoji = () => {
    if (!round) return '';
    console.log('Categoría de la ronda:', round.category); // Para debug
    
    switch (round.category) {
      case 'Peliculas':
      case 'Películas':
        return '🎬';
      case 'Siglas':
        return '🔤';
      case 'Personajes':
        return '👤';
      case 'Palabras':
        return '📝';
      case 'Muertes':
        return '💀';
      case 'Idiomas':
        return '🌍';
      default:
        return '❓';
    }
  };

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
      <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mt-12">
        BULLSHIT
      </h1>
      
      <p className="text-[#131309] text-xl mt-4">
        RONDA {round.number}
      </p>

      <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
        <div className="flex flex-col items-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4"
            style={{ backgroundColor: moderator.avatar_color }}
          >
            {moderator.name.charAt(0).toUpperCase()}
          </div>
          <p className="text-[#131309] text-xl font-bold mb-1">{moderator.name}</p>
          <p className="text-[#131309] text-lg mb-6">será el moderador</p>

          <div className="bg-[#131309] w-20 h-20 rounded-[10px] flex items-center justify-center mb-4">
            <span className="text-4xl">{getCategoryEmoji()}</span>
          </div>
          <p className="text-[#131309] text-xl font-bold uppercase">
            {round.category}
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0">
        <div className="bg-white w-full px-6 pt-5 pb-8">
          <div className="max-w-[327px] mx-auto">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold mb-4">{countdown}s</span>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#CB1517] transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 