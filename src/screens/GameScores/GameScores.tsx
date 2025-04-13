import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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

        // 2. Obtener TODAS las puntuaciones del juego
        const { data: allScores } = await supabase
          .from('scores')
          .select('*')
          .eq('game_id', gameId);
          
        // 3. Obtener las puntuaciones SOLO de la ronda actual
        const currentRoundId = location.state?.roundId;
        const currentRoundScores = allScores?.filter(score => 
          score.round_id === currentRoundId
        ) || [];

        // 4. Calcular puntuaciones por jugador de forma correcta
        const calculatedScores = players.map(player => {
          // Filtrar puntuaciones GLOBALES para este jugador
          const playerGlobalScores = allScores?.filter(s => s.player_id === player.id) || [];
          
          // Calcular puntos globales por tipo de razón (sin duplicar)
          const uniqueGlobalScores = Array.from(
            // Agrupar por combinación única de round_id + reason para evitar contar dos veces la misma razón en la misma ronda
            new Map(playerGlobalScores.map(score => 
              [`${score.round_id}-${score.reason}`, score]
            )).values()
          );
          
          const globalCorrectVotePoints = uniqueGlobalScores
            .filter(s => s.reason === 'Voto correcto')
            .reduce((sum, score) => sum + score.points, 0);
            
          const globalReceivedVotesPoints = uniqueGlobalScores
            .filter(s => s.reason === 'Votos recibidos')
            .reduce((sum, score) => sum + score.points, 0);
          
          // Filtrar puntuaciones SOLO DE ESTA RONDA para este jugador
          const playerRoundScores = currentRoundScores.filter(s => s.player_id === player.id);
          
          const roundCorrectVotePoints = playerRoundScores
            .filter(s => s.reason === 'Voto correcto')
            .reduce((sum, score) => sum + score.points, 0);
            
          const roundReceivedVotesPoints = playerRoundScores
            .filter(s => s.reason === 'Votos recibidos')
            .reduce((sum, score) => sum + score.points, 0);

          // Devolver objeto con ambas puntuaciones claramente separadas
          return {
            player,
            // Total global (todas las rondas)
            totalPoints: globalCorrectVotePoints + globalReceivedVotesPoints,
            // Puntos solo de esta ronda
            roundPoints: playerRoundScores.map(score => ({
              points: score.points,
              reason: score.reason
            })),
            // Separar los puntos para mejor diagnóstico
            correctVotePoints: roundCorrectVotePoints,
            receivedVotesPoints: roundReceivedVotesPoints,
            // Agregar campos para diagnóstico
            globalCorrectVotePoints,
            globalReceivedVotesPoints
          };
        });
        
        // Log para diagnóstico
        console.log('Puntuaciones calculadas:', calculatedScores);
        
        // Ordenar por puntos totales
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
    if (countdown <= 0) {
      console.log('⏱️ Countdown terminado, navegando a la pantalla de próxima ronda...');
      navigate(`/game/${gameId}/next-round`, {
        state: {
          playerName: location.state?.playerName,
          roundNumber: roundNumber + 1,
          // Asegurarse de pasar cualquier otro dato relevante del estado actual
          currentPlayer: location.state?.currentPlayer,
          players: location.state?.players
        }
      });
    } else {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, gameId, navigate, roundNumber, location.state]);

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
          {playerScores.map((playerScore) => (
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
                  className="h-full bg-[#804000] transition-all duration-1000 ease-linear"
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