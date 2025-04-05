import fs from 'fs';
import path from 'path';

// Crear directorio si no existe
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Definir categorías
const categories = [
  'Historia', 'Ciencia', 'Arte', 'Geografía', 'Deportes', 
  'Entretenimiento', 'Literatura', 'Tecnología'
];

// Crear preguntas de ejemplo
const questions = [];

for (let i = 1; i <= 20; i++) {
  const category = categories[Math.floor(Math.random() * categories.length)];
  const difficulty = Math.floor(Math.random() * 5) + 1;
  
  questions.push({
    question_id: `sample-${i}`,
    type: 'general',
    question_intro: `Introducción para la pregunta ${i}`,
    question_text: `Esta es la pregunta de ejemplo número ${i} sobre ${category}`,
    answer: `Respuesta a la pregunta ${i}`,
    category,
    difficulty
  });
}

// Convertir a CSV
const headers = ['question_id', 'type', 'question_intro', 'question_text', 'answer', 'category', 'difficulty'];
const csvContent = [
  headers.join(','),
  ...questions.map(q => 
    `${q.question_id},${q.type},"${q.question_intro}","${q.question_text}","${q.answer}",${q.category},${q.difficulty}`
  )
].join('\n');

// Guardar archivo CSV
const csvPath = path.resolve(dataDir, 'questions.csv');
fs.writeFileSync(csvPath, csvContent, 'utf8');

console.log(`✅ Archivo de ejemplo creado: ${csvPath}`); 