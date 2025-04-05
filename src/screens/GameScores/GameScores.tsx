import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import type { Player } from "../../lib/types";

interface PlayerScore {
  player: Player;
  totalPoints: number;
  roundPoints: {
    points: number;
    reason: string;
  }[];
  correctVotePoints: number;  // Puntos por acertar
  receivedVotesPoints: number;  // Puntos por votos recibidos
}

export const GameScores = () => {
  const location = useLocation();
  const { gameId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const roundNumber = location.state?.roundNumber;
  const [countdown, setCountdown] = useState(10);
  const navigate = useNavigate();

  // Calcular puntuaciones
  useEffect(() => {
    const calculateScores = async () => {
      try {
        setIsLoading(true);
        
        // 1. Obtener los jugadores
        const { data: players } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameId);

        if (!players) return;

        // 2. Obtener las puntuaciones
        const { data: scores } = await supabase
          .from('scores')
          .select('*')
          .eq('game_id', gameId);

        // 3. Calcular puntuaciones por jugador
        const calculatedScores = players.map(player => {
          const playerScores = scores?.filter(s => s.player_id === player.id) || [];
          const correctVotePoints = playerScores
            .filter(s => s.reason === 'Voto correcto')
            .reduce((sum, score) => sum + score.points, 0);
          const receivedVotesPoints = playerScores
            .filter(s => s.reason === 'Votos recibidos')
            .reduce((sum, score) => sum + score.points, 0);

          return {
            player,
            totalPoints: correctVotePoints + receivedVotesPoints,
            roundPoints: playerScores
              .filter(score => score.round_id === location.state?.roundId)
              .map(score => ({
                points: score.points,
                reason: score.reason
              })),
            correctVotePoints,
            receivedVotesPoints
          };
        });

        // 4. Ordenar por puntos totales
        calculatedScores.sort((a, b) => b.totalPoints - a.totalPoints);
        
        setPlayerScores(calculatedScores);
      } catch (error) {
        console.error('Error loading scores:', error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateScores();
  }, [gameId, location.state?.roundId]);

  // Timer para la navegación
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }

    if (countdown === 0) {
      const navigateToNextRound = async () => {
        try {
          console.log('⏱️ Timer completado, buscando siguiente ronda...', {
            currentRound: roundNumber,
            gameId
          });

          // 1. Marcar la ronda actual como inactiva
          await supabase
            .from('rounds')
            .update({ active: false })
            .eq('id', location.state?.roundId);

          // 2. Obtener la siguiente ronda
          const { data: nextRound, error } = await supabase
            .from('rounds')
            .select()
            .eq('game_id', gameId)
            .gt('number', roundNumber)
            .order('number', { ascending: true })
            .limit(1)
            .single();

          if (error || !nextRound) {
            console.log('No hay más rondas, volviendo al lobby...');
            navigate(`/game/${gameId}/lobby`);
            return;
          }

          // 3. Marcar la siguiente ronda como activa
          await supabase
            .from('rounds')
            .update({ active: true })
            .eq('id', nextRound.id);

          // 4. Actualizar el current_round_id en la tabla games
          await supabase
            .from('games')
            .update({ current_round_id: nextRound.id })
            .eq('id', gameId);

          console.log('✅ Siguiente ronda activada:', {
            roundId: nextRound.id,
            number: nextRound.number
          });

          // 5. Navegar a la pantalla de introducción para la siguiente ronda
          navigate(`/game/${gameId}/round/intro`, {
            state: { 
              playerName: location.state?.playerName,
              roundNumber: nextRound.number,
              roundId: nextRound.id,
              moderatorId: nextRound.moderator_id,
              category: nextRound.category
            }
          });

        } catch (err) {
          console.error('Error navegando a siguiente ronda:', err);
          navigate(`/game/${gameId}/lobby`);
        }
      };

      navigateToNextRound();
    }
  }, [countdown, gameId, navigate, location.state?.playerName, roundNumber]);

  if (isLoading) {
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center justify-center">
        <p className="text-[#131309] text-lg">Cargando puntuaciones...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
      <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mt-12">
        Puntuaciones
      </h1>
      
      <p className="text-[#131309] text-xl mt-4">
        RONDA {roundNumber}
      </p>

      <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
        <div className="space-y-4">
          {playerScores.map((playerScore, index) => (
            <div 
              key={playerScore.player.id}
              className="flex flex-col p-4 bg-[#E7E7E6] rounded-[10px]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: playerScore.player.avatar_color }}
                  >
                    {playerScore.player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[#131309]">{playerScore.player.name}</span>
                </div>
                <span className="text-[#131309] font-bold">{playerScore.totalPoints} pts</span>
              </div>

              <div className="pl-11 space-y-1 text-sm text-gray-600">
                {playerScore.correctVotePoints > 0 && (
                  <div className="flex justify-between">
                    <span>Acierto</span>
                    <span>{playerScore.correctVotePoints} pts</span>
                  </div>
                )}
                {playerScore.receivedVotesPoints > 0 && (
                  <div className="flex justify-between">
                    <span>Votos recibidos</span>
                    <span>{playerScore.receivedVotesPoints} pts</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Añadir el timer en la parte inferior */}
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