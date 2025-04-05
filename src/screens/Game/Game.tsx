import { getQuestionForRound, getRandomQuestion } from '../../services/questionService';

const createNewRound = async () => {
  try {
    console.log('🎮 Creando ronda', currentRound + 1, 'para juego:', gameId);
    
    // 1. Obtener la pregunta preseleccionada para esta ronda
    const question = await getQuestionForRound(gameId, currentRound + 1);
    
    // 2. Si no hay pregunta preseleccionada, usar método de respaldo
    const finalQuestion = question || await getRandomQuestion(gameId);
    
    if (!finalQuestion) {
      console.error('❌ No se pudo obtener una pregunta');
      return;
    }
    
    console.log('📝 Pregunta seleccionada:', finalQuestion.text);
    
    // 3. Crear la ronda con esta pregunta
    const { data: newRound, error } = await supabase
      .from('rounds')
      .insert({
        game_id: gameId,
        number: currentRound + 1,
        question_id: finalQuestion.id,
        phase: 'initial',
        moderator_id: getRandomModerator(),
        question: {
          text: finalQuestion.text,
          content: finalQuestion.content,
          correct_answer: finalQuestion.correct_answer
        }
      })
      .select()
      .single();
      
    if (error) {
      console.error('❌ Error creando nueva ronda:', error);
      return;
    }
    
    console.log('✅ Ronda creada con éxito:', newRound.id);
    
    // Actualizar estados locales
    setCurrentRound(currentRound + 1);
    setRound(newRound);
    
  } catch (error) {
    console.error('❌ Error iniciando nueva ronda:', error);
  }
}; 