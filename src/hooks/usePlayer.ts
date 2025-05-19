import { supabase } from "../lib/supabase";
import type { Player } from "../lib/types";
import { useMutation } from "@tanstack/react-query";

export function useJoinGame() {
  const {
    mutateAsync: joinGame,
    isPending: loading,
    error,
  } = useMutation({
    mutationFn: async ({ gameId, playerName }: {gameId: string; playerName: string}) => {
      const { data, error } = await supabase
        .from("players")
        .insert([{ game_id: gameId, name: playerName.trim() }])
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Unknown error joining game");
      }

      return data as Player;
    },
  });

  return {
    joinGame: (gameId: string | undefined, playerName: string) => {
      if (!gameId) {
        return Promise.reject(new Error("Invalid game id"));
      }
      return joinGame({ gameId, playerName });
    },
    loading,
    error,
  };
} 