const createNewGame = async () => {
  // Primero crear el jugador
  const { data: newPlayer, error: playerError } = await supabase
    .from('players')
    .insert({
      name: playerName,
      game_id: null, // Se actualizará después
      avatar_color: getRandomColor()
    })
    .select()
    .single();

  if (playerError) {
    console.error('Error creating player:', playerError);
    return;
  }

  // Luego crear el juego con el ID del creador
  const { data: newGame, error: gameError } = await supabase
    .from('games')
    .insert({
      name: gameName,
      creator_id: newPlayer.id, // Guardar el ID del creador
      // ... otros campos del juego
    })
    .select()
    .single();

  if (gameError) {
    console.error('Error creating game:', gameError);
    return;
  }

  // Actualizar el jugador con el ID del juego
  await supabase
    .from('players')
    .update({ game_id: newGame.id })
    .eq('id', newPlayer.id);

  // Navegar al siguiente paso
  navigate(`/game/${newGame.id}/share`, { 
    state: { playerName: playerName } 
  });
}; 