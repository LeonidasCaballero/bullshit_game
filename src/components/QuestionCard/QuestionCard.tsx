import React, { useState } from 'react';

interface QuestionCardProps {
  text: string;
  content: string;
  onSubmit: (answer: string) => void;
  isSubmitting?: boolean;
}

export const QuestionCard = ({ text, content, onSubmit, isSubmitting }: QuestionCardProps) => {
  const [answer, setAnswer] = useState('');

  return (
    <div className="w-full max-w-[400px] mx-auto px-4">
      <div className="bg-white rounded-[20px] p-6 w-full">
        <div className="bg-[#131309] rounded-[20px] p-6 mb-4">
          <p className="text-white text-xl text-center">
            {text}
          </p>
        </div>

        <p className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] text-center mb-6">
          {content}
        </p>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Tu respuesta"
          className="w-full p-4 border border-gray-200 rounded-[10px] mb-4"
          rows={4}
        />

        <button
          onClick={() => onSubmit(answer)}
          disabled={isSubmitting || !answer.trim()}
          className="w-full h-12 bg-[#804000] hover:bg-[#603000] text-white rounded-[10px] font-bold text-base disabled:opacity-50"
        >
          {isSubmitting ? "Enviando..." : "Enviar respuesta"}
        </button>
      </div>
    </div>
  );
}; 