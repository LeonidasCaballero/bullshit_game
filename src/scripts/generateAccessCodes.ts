import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener las variables de entorno directamente del archivo .env
const supabaseUrl = 'https://zffcisngubgsvqgybjtt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmZmNpc25ndWJnc3ZxZ3lianR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MTE0MzQsImV4cCI6MjA1ODA4NzQzNH0.u7qvDIzyUMrGmEn6iJxYh7Cba5Z57evG6FyRpoANr5E';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no encontradas');
  process.exit(1);
}

// Crear cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Función para generar un código aleatorio
const generateCode = () => {
  // Generar 6 caracteres aleatorios (letras y números)
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  // Formato: BS24XXXX (BS = BullShit, 24 = año, XXXX = random)
  return `BS24${random}`;
};

// Función para generar códigos únicos
const generateUniqueCodes = async (quantity: number) => {
  const codes = new Set<string>();
  let attempts = 0;
  const MAX_ATTEMPTS = quantity * 2; // Límite de intentos para evitar bucles infinitos
  
  console.log(`\n🎯 Iniciando generación de ${quantity} códigos únicos`);
  console.log('📝 Formato de código: BS24XXXXXX (10 caracteres)\n');
  
  while (codes.size < quantity && attempts < MAX_ATTEMPTS) {
    const batchSize = Math.min(50, quantity - codes.size);
    const newCodes = new Set<string>();
    
    console.log(`\n🔄 Intento ${attempts + 1}: Generando lote de ${batchSize} códigos`);
    
    // Generar un lote de códigos
    for (let i = 0; i < batchSize; i++) {
      const code = generateCode();
      newCodes.add(code);
      console.log(`   Generado: ${code}`);
    }
    
    try {
      console.log('\n🔍 Verificando duplicados en la base de datos...');
      
      // Verificar cuáles de estos códigos ya existen
      const { data, error } = await supabase
        .from('access_codes')
        .select('code')
        .in('code', Array.from(newCodes));
      
      if (error) {
        console.error('❌ Error verificando códigos:', error);
        continue;
      }
      
      // Añadir solo los códigos que no existen
      const existingCodes = new Set(data?.map(d => d.code));
      let newValidCodes = 0;
      
      newCodes.forEach(code => {
        if (!existingCodes.has(code)) {
          codes.add(code);
          newValidCodes++;
        }
      });
      
      console.log(`✅ ${newValidCodes} nuevos códigos válidos añadidos`);
      console.log(`📊 Progreso total: ${codes.size}/${quantity} códigos generados`);
      
    } catch (err) {
      console.error('❌ Error en la consulta:', err);
    }
    
    attempts++;
  }
  
  if (codes.size < quantity) {
    throw new Error(`❌ No se pudieron generar suficientes códigos únicos después de ${attempts} intentos`);
  }
  
  console.log(`\n🎉 Generación completada: ${codes.size} códigos únicos generados\n`);
  return Array.from(codes);
};

// Función principal
async function main() {
  try {
    // Número de códigos a generar
    const quantity = process.argv[2] ? parseInt(process.argv[2]) : 10;
    console.log(`\n🚀 Iniciando proceso de generación de ${quantity} códigos de acceso...`);
    
    // Generar códigos únicos
    const codes = await generateUniqueCodes(quantity);
    
    // Preparar datos para inserción
    const accessCodes = codes.map(code => ({
      code,
      is_used: false,
      created_at: new Date().toISOString()
    }));
    
    console.log('\n📥 Insertando códigos en la base de datos...');
    
    // Insertar en la base de datos
    const { error } = await supabase
      .from('access_codes')
      .insert(accessCodes);
    
    if (error) {
      console.error('❌ Error insertando códigos:', error);
      throw error;
    }
    
    // Crear directorio para el archivo CSV si no existe
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const outputDir = path.join(__dirname, '../..', 'generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generar archivo CSV
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvPath = path.join(outputDir, `access_codes_${timestamp}.csv`);
    
    const csvContent = [
      'Código,Fecha de Generación',
      ...codes.map(code => `${code},${new Date().toISOString()}`)
    ].join('\n');
    
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    
    console.log('\n✅ Proceso completado exitosamente');
    console.log(`📁 Archivo CSV guardado en: ${csvPath}`);
    console.log('\n📋 Primeros 10 códigos generados como muestra:');
    codes.slice(0, 10).forEach(code => console.log(`   ${code}`));
    console.log(`   ... y ${codes.length - 10} códigos más\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar el script
main(); 