const { data: newGame, error } = await supabase
  .from('games')
  .insert({
    name: gameName,
    creator_id: currentUser.id,
    started: false
  })
  .select()
  .single(); 