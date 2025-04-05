import { supabase } from '../lib/supabase';

async function checkQuestionsSchema() {
  try {
    console.log('📊 Verificando estructura y datos de la tabla questions...');
    
    // 1. Verificar categorías existentes
    const { data: categories, error: catError } = await supabase
      .from('questions')
      .select('category')
      .limit(100);
    
    if (catError) {
      console.error('❌ Error obteniendo categorías:', catError);
      return;
    }
    
    // Mostrar categorías únicas
    const uniqueCategories = [...new Set(categories.map(q => q.category))];
    console.log('📋 Categorías encontradas:', uniqueCategories);
    
    // 2. Verificar estructura de la tabla
    const { data: schemaInfo } = await supabase.rpc('debug_table_structure', {
      table_name: 'questions'
    });
    
    console.log('🏗️ Estructura de la tabla questions:', schemaInfo);
    
    // 3. Verificar algunos registros
    const { data: samples } = await supabase
      .from('questions')
      .select('*')
      .limit(3);
    
    console.log('📝 Ejemplos de registros:');
    samples.forEach((q, i) => {
      console.log(`[${i + 1}]`, q);
    });
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkQuestionsSchema(); 