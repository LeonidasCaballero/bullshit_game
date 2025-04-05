import { supabase } from '../lib/supabase';
import type { Question } from '../lib/types';

// Interfaz para Question
export interface Question {
  id: string;
  question_id: string;
  question_intro: string | null;
  question_text: string;
  answer: string;
  category: string;
  difficulty: number;
  times_used: number;
  times_answered_correctly: number;
}

// Inicializar juego con preguntas preseleccionadas
export const initializeGameQuestions = async (gameId: string, roundCount: number = 7): Promise<boolean> => {
  try {
    // Llamar a la función SQL que hace la selección
    const { error } = await supabase.rpc('initialize_game_questions', {
      p_game_id: gameId,
      total_rounds: roundCount
    });
    
    if (error) {
      console.error('Error inicializando preguntas:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error en servicio de preguntas:', error);
    return false;
  }
};

// Obtener pregunta para una ronda específica
export const getQuestionForRound = async (gameId: string, roundNumber: number): Promise<Question | null> => {
  try {
    // 1. Buscar la pregunta pre-seleccionada
    const { data: gameQuestion, error } = await supabase
      .from('game_questions')
      .select('question_id')
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)
      .single();
    
    if (error || !gameQuestion) {
      console.warn(`No hay pregunta preseleccionada para la ronda ${roundNumber}`);
      return null;
    }
    
    // 2. Obtener detalles de la pregunta
    const { data, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', gameQuestion.question_id)
      .single();
    
    if (questionError) {
      console.error('Error obteniendo detalles de pregunta:', questionError);
      return null;
    }
    
    // 3. Marcar como usada
    await supabase
      .from('game_questions')
      .update({ used: true })
      .eq('game_id', gameId)
      .eq('round_number', roundNumber);
    
    return data;
  } catch (error) {
    console.error('Error obteniendo pregunta para ronda:', error);
    return null;
  }
};

// Obtener pregunta aleatoria (fallback)
export const getRandomQuestion = async (gameId: string): Promise<Question | null> => {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('RANDOM()')
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error obteniendo pregunta aleatoria:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error en servicio de preguntas:', error);
    return null;
  }
};

// Verificar la tabla de preguntas
export const verifyQuestionsTable = async (): Promise<void> => {
  try {
    // Contar preguntas por categoría
    const { data: categoryCounts, error: countError } = await supabase
      .from('questions')
      .select('category, count(*)')
      .group('category');
    
    if (countError) {
      console.error('❌ Error contando categorías:', countError);
      return;
    }
    
    console.log('📊 Distribución de preguntas por categoría:');
    categoryCounts.forEach((cat: any) => {
      console.log(`- ${cat.category}: ${cat.count} preguntas`);
    });
    
    // Obtener ejemplos de preguntas
    const { data: samples, error: sampleError } = await supabase
      .from('questions')
      .select('*')
      .limit(5);
    
    if (sampleError) {
      console.error('❌ Error obteniendo ejemplos:', sampleError);
      return;
    }
    
    console.log('📝 Ejemplos de preguntas:');
    samples.forEach((q: any) => {
      console.log(`[${q.category}] ${q.text}: ${q.content} (Resp: ${q.correct_answer})`);
    });
  } catch (error) {
    console.error('❌ Error verificando tabla de preguntas:', error);
  }
};

// Obtener pregunta por ID
export const getQuestionById = async (questionId: string): Promise<Question | null> => {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();
    
    if (error) {
      console.error('❌ Error obteniendo pregunta por ID:', error);
      return null;
    }
    
    return {
      ...data,
      type: 'general' // Valor predeterminado
    };
  } catch (error) {
    console.error('❌ Error en servicio de preguntas:', error);
    return null;
  }
};

// Registrar respuesta correcta
export const incrementCorrectAnswers = async (questionId: string): Promise<void> => {
  try {
    const { data } = await supabase
      .from('questions')
      .select('times_answered_correctly')
      .eq('id', questionId)
      .single();
    
    if (data) {
      await supabase
        .from('questions')
        .update({ times_answered_correctly: data.times_answered_correctly + 1 })
        .eq('id', questionId);
    }
  } catch (error) {
    console.error('❌ Error actualizando estadísticas de pregunta:', error);
  }
};

// Obtener estadísticas de preguntas
export const getQuestionStats = async (): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('category, difficulty, COUNT(*), AVG(times_answered_correctly/NULLIF(times_used,0))')
      .group('category, difficulty');
    
    if (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error en servicio de preguntas:', error);
    return null;
  }
}; 