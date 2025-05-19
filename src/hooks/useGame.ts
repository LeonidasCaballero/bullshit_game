import { useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Game } from "../lib/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to fetch a single game by id. Returns the game, loading and error state.
 */
export function useGame(gameId?: string) {
  const {
    data: game,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["game", gameId],
    enabled: !!gameId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (error) throw new Error(error.message);
      return data as Game;
    },
  });

  return { game, loading, error };
}

/**
 * Hook that returns a function to create a new game.
 */
export function useCreateGame() {
  const queryClient = useQueryClient();

  const {
    mutateAsync: createGame,
    isPending: loading,
    error,
  } = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("games")
        .insert([{ name }])
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Unknown error creating game");
      }
      return data as Game;
    },
    onSuccess: (newGame: Game) => {
      // Cache the new game
      queryClient.setQueryData(["game", newGame.id], newGame);
    },
  });

  return { createGame, loading, error };
} 