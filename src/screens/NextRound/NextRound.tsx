import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Loader2 } from "lucide-react";

export const NextRound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { gameId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prepareNextRound = async () => {
      try {
        setIsLoading(true);
        const currentRoundNumber = location.state?.roundNumber - 1 || 0;
        
        console.log('🔄 Preparando siguiente ronda...', {
          currentRoundNumber: currentRoundNumber,
          nextRoundNumber: currentRoundNumber + 1,
          gameId
        });

        // 1. Desactivar la ronda actual si existe
        if (currentRoundNumber > 0) {
          const { error: updateError } = await supabase
            .from('rounds')
            .update({ active: false })
            .eq('game_id', gameId)
            .eq('number', currentRoundNumber);

          if (updateError) {
            console.error('❌ Error al desactivar ronda actual:', updateError);
            throw updateError;
          }
        }

        // 2. Obtener la siguiente ronda
        const { data: nextRound, error: fetchError } = await supabase
          .from('rounds')
          .select('*')
          .eq('game_id', gameId)
          .eq('number', currentRoundNumber + 1)
          .single();

        if (fetchError) {
          console.error('❌ Error al obtener siguiente ronda:', fetchError);
          throw fetchError;
        }

        if (!nextRound) {
          console.log('🏁 Fin del juego - No hay más rondas');
          // TODO: Navegar a pantalla final
          return;
        }

        // 3. Activar la siguiente ronda
        const { error: activateError } = await supabase
          .from('rounds')
          .update({ 
            active: true,
            voting_phase: false,
            reading_phase: false,
            results_phase: false,
            scoring_phase: false
          })
          .eq('id', nextRound.id);

        if (activateError) {
          console.error('❌ Error al activar siguiente ronda:', activateError);
          throw activateError;
        }

        console.log('✅ Siguiente ronda activada:', {
          roundId: nextRound.id,
          number: nextRound.number,
          category: nextRound.category
        });

        // 4. Navegar a la pantalla de introducción
        navigate(`/game/${gameId}/round/intro`, {
          state: {
            playerName: location.state?.playerName,
            currentPlayer: location.state?.currentPlayer,
            players: location.state?.players,
            roundNumber: nextRound.number,
            roundId: nextRound.id,
            category: nextRound.category
          }
        });
      } catch (err) {
        console.error('❌ Error preparando siguiente ronda:', err);
        setError('Error al preparar la siguiente ronda');
      } finally {
        setIsLoading(false);
      }
    };

    prepareNextRound();
  }, [gameId, navigate, location.state]);

  if (error) {
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center justify-center">
        <p className="text-[#CB1517] text-lg">{error}</p>
        <button 
          className="mt-4 bg-[#131309] text-white px-4 py-2 rounded-lg"
          onClick={() => navigate(`/game/${gameId}/lobby`)}
        >
          Volver al lobby
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center justify-center">
      <Loader2 className="h-8 h-8 animate-spin text-[#131309] mb-4" />
      <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309]">
        Siguiente Ronda
      </h1>
      <p className="text-[#131309] text-lg mt-4">Preparando la ronda...</p>
    </div>
  );
}; 