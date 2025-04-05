import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Crear cliente Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Preguntas de ejemplo por categoría
const sampleQuestions = [
  // Categoría: películas
  {
    category: 'pelicula',
    text: '¿Cuál es el verdadero título de esta película?',
    content: 'Un robot policía lucha contra el crimen en un Detroit distópico',
    correct_answer: 'RoboCop',
    difficulty: 1
  },
  {
    category: 'pelicula',
    text: '¿Cuál es el verdadero título de esta película?',
    content: 'Un arqueólogo busca el Arca de la Alianza antes que los nazis',
    correct_answer: 'En busca del arca perdida',
    difficulty: 1
  },
  
  // Categoría: siglas
  {
    category: 'sigla',
    text: '¿Qué significan realmente estas siglas?',
    content: 'NASA',
    correct_answer: 'National Aeronautics and Space Administration',
    difficulty: 1
  },
  {
    category: 'sigla',
    text: '¿Qué significan realmente estas siglas?',
    content: 'FIFA',
    correct_answer: 'Fédération Internationale de Football Association',
    difficulty: 1
  },
  
  // Categoría: personaje
  {
    category: 'personaje',
    text: '¿Quién es este personaje?',
    content: 'Superhéroe con poderes arácnidos que vive en Nueva York',
    correct_answer: 'Spider-Man',
    difficulty: 1
  },
  {
    category: 'personaje',
    text: '¿Quién es este personaje?',
    content: 'Pirata que busca el tesoro del One Piece',
    correct_answer: 'Monkey D. Luffy',
    difficulty: 2
  }
];

// Función para insertar preguntas
async function seedQuestions() {
  try {
    console.log('🌱 Insertando preguntas de ejemplo...');
    
    const { data, error } = await supabase
      .from('questions')
      .insert(sampleQuestions)
      .select();
    
    if (error) {
      console.error('❌ Error insertando preguntas:', error);
      return;
    }
    
    console.log(`✅ ${data.length} preguntas insertadas correctamente`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar la función
seedQuestions(); 