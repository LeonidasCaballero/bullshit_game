import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Crear cliente Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyQuestions() {
  try {
    console.log('🔍 Verificando tabla de preguntas...');
    
    // 1. Contar total de preguntas
    const { count, error: countError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error contando preguntas:', countError);
      return;
    }
    
    console.log(`📊 Total de preguntas: ${count || 0}`);
    
    // 2. Contar por categoría
    const { data: categories, error: catError } = await supabase
      .from('questions')
      .select('category, count(*)')
      .group('category');
    
    if (catError) {
      console.error('❌ Error contando categorías:', catError);
    } else {
      console.log('📊 Distribución por categoría:');
      categories.forEach((cat: any) => {
        console.log(`- ${cat.category}: ${cat.count} preguntas`);
      });
    }
    
    // 3. Verificar campos vacíos
    const { count: emptyCount, error: emptyError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .or('text.is.null,content.is.null,correct_answer.is.null');
    
    if (emptyError) {
      console.error('❌ Error verificando campos vacíos:', emptyError);
    } else {
      console.log(`⚠️ Preguntas con campos vacíos: ${emptyCount || 0}`);
    }
    
    // 4. Mostrar algunas preguntas de ejemplo
    const { data: samples, error: sampleError } = await supabase
      .from('questions')
      .select('*')
      .limit(5);
    
    if (sampleError) {
      console.error('❌ Error obteniendo ejemplos:', sampleError);
    } else {
      console.log('📝 Ejemplos de preguntas:');
      samples.forEach((q: any) => {
        console.log(`[${q.category}] ${q.text || '-'}: ${q.content || '-'} (Resp: ${q.correct_answer || '-'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error en la verificación:', error);
  }
}

// Ejecutar la verificación
verifyQuestions(); 