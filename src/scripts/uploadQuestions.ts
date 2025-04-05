import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Crear cliente Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Fix para __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para procesar un archivo CSV
const processCSV = (filePath: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log(`✅ CSV procesado: ${results.length} preguntas encontradas`);
        resolve(results);
      })
      .on('error', (error) => {
        console.error('❌ Error procesando CSV:', error);
        reject(error);
      });
  });
};

// Función para cargar preguntas en la base de datos
const uploadQuestions = async (questions: any[]): Promise<void> => {
  // Preparar datos para inserción
  const formattedQuestions = questions.map(q => ({
    question_id: q.question_id || `q-${Math.random().toString(36).substring(2, 10)}`,
    type: q.type || 'general',
    question_intro: q.question_intro || null,
    question_text: q.question_text,
    answer: q.answer,
    category: q.category || 'general',
    difficulty: parseInt(q.difficulty || '2'),
    times_used: 0,
    times_answered_correctly: 0
  }));
  
  // Procesar en lotes de 100 para evitar límites de tamaño
  const batchSize = 100;
  const batches = [];
  
  for (let i = 0; i < formattedQuestions.length; i += batchSize) {
    batches.push(formattedQuestions.slice(i, i + batchSize));
  }
  
  console.log(`🔄 Procesando ${batches.length} lotes de preguntas...`);
  
  // Insertar cada lote
  for (const [index, batch] of batches.entries()) {
    try {
      const { error } = await supabase
        .from('questions')
        .insert(batch);
      
      if (error) throw error;
      
      console.log(`✅ Lote ${index + 1}/${batches.length} insertado correctamente`);
    } catch (error) {
      console.error(`❌ Error insertando lote ${index + 1}:`, error);
    }
  }
  
  console.log('✅ Carga de preguntas completada');
};

// Función principal
const main = async () => {
  try {
    const csvPath = path.resolve(__dirname, '../data/questions.csv');
    
    // Verificar si el archivo existe
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ Archivo no encontrado: ${csvPath}`);
      return;
    }
    
    // Procesar CSV
    const questions = await processCSV(csvPath);
    
    // Cargar en Supabase
    await uploadQuestions(questions);
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  }
};

main(); 