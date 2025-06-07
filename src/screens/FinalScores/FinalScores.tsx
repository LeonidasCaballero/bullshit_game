import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
// @ts-ignore - canvas-confetti has no TS types in our setup
import confetti from "canvas-confetti";
import { supabase } from "../../lib/supabase";
import type { Player } from "../../lib/types";

interface PlayerWithScore extends Player {
  totalPoints: number;
}

export const FinalScores = () => {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const playerName: string | undefined = location.state?.playerName;

  const [players, setPlayers] = useState<PlayerWithScore[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerWithScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [creatingGame, setCreatingGame] = useState(false);

  // Confetti once on mount
  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
    });
  }, []);

  useEffect(() => {
    const loadScores = async () => {
      if (!gameId) return;
      try {
        setIsLoading(true);
        const { data: playersData, error: playersErr } = await supabase
          .from("players")
          .select("*")
          .eq("game_id", gameId);
        if (playersErr) throw playersErr;

        const { data: scoresData, error: scoresErr } = await supabase
          .from("scores")
          .select("*")
          .eq("game_id", gameId);
        if (scoresErr) throw scoresErr;

        // calculate total per player (deduplicated per round+reason as before)
        const calc: PlayerWithScore[] = (playersData || []).map((p) => {
          const playerScores = (scoresData || []).filter((s) => s.player_id === p.id);
          const unique = Array.from(
            new Map(playerScores.map((s) => [`${s.round_id}-${s.reason}`, s])).values()
          );
          const total = unique.reduce((sum, s) => sum + s.points, 0);
          return { ...p, totalPoints: total };
        });

        calc.sort((a, b) => b.totalPoints - a.totalPoints);
        setPlayers(calc);
        if (playerName) {
          setCurrentPlayer(calc.find((p) => p.name === playerName) || null);
        }
      } catch (err) {
        console.error("Error loading final scores", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadScores();
  }, [gameId, playerName]);

  const maxPoints = players.length ? players[0].totalPoints : 0;
  const winners = players.filter((p) => p.totalPoints === maxPoints);

  const handleCreateNewGame = async () => {
    if (!currentPlayer?.is_host) return;
    try {
      setCreatingGame(true);
      // fetch current game name
      const { data: currentGame } = await supabase
        .from("games")
        .select("name")
        .eq("id", gameId)
        .single();

      const { data: newGameData, error: insertErr } = await supabase
        .from("games")
        .insert({ name: currentGame?.name || "BULLSHIT", started: false })
        .select()
        .single();
      if (insertErr) throw insertErr;

      // add host as player in new game
      await supabase.from("players").insert({
        game_id: newGameData.id,
        name: currentPlayer.name,
        avatar_color: currentPlayer.avatar_color,
        is_host: true,
      });

      navigate(`/share/${newGameData.id}`);
    } catch (err) {
      console.error("Error creating new game", err);
    } finally {
      setCreatingGame(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center justify-center">
        <p className="text-[#131309] text-lg">Cargando resultados finales...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center px-4">
      <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mt-10">
        ¡FIN DEL JUEGO!
      </h1>

      <div className="mt-6 w-full max-w-[375px]">
        <div className="bg-[#131309] rounded-[20px] p-6 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Ganador{winners.length>1? 'es':''}</h2>
          {winners.map((w) => (
            <div key={w.id} className="flex items-center justify-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: w.avatar_color }}
              >
                {w.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-xl font-bold">{w.name}</p>
            </div>
          ))}
          <p className="text-xl mt-2">con {maxPoints} pts</p>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-[20px] p-6 mt-6 space-y-3">
          {players.map((p, idx) => (
            <div key={p.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold">{idx + 1}.</span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: p.avatar_color }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span>{p.name}</span>
              </div>
              <span className="font-bold">{p.totalPoints} pts</span>
            </div>
          ))}
        </div>

        {currentPlayer?.is_host && (
          <button
            onClick={handleCreateNewGame}
            disabled={creatingGame}
            className="mt-8 w-full h-12 bg-[#804000] hover:bg-[#603000] text-white rounded-[10px] font-bold text-base disabled:opacity-50"
          >
            {creatingGame ? "Creando..." : "Crear nueva partida"}
          </button>
        )}
      </div>
    </div>
  );
}; 