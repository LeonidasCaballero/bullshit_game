import React from 'react';
import { Button } from '../../../../components/ui/button'; // Adjust path as needed

interface PlayerAnsweringViewProps {
  answer: string;
  setAnswer: (answer: string) => void;
  handleSubmitAnswer: () => void;
}

export const PlayerAnsweringView: React.FC<PlayerAnsweringViewProps> = ({
  answer,
  setAnswer,
  handleSubmitAnswer,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0">
      <div className="bg-white w-full px-6 pt-5 pb-8">
        <div className="max-w-[327px] mx-auto space-y-4">
          <textarea
            className="w-full min-h-[120px] p-4 border border-[#13130920] rounded-[20px] text-[#131309] resize-none"
            placeholder="Tu respuesta"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <Button
            className="w-full h-12 bg-[#804000] hover:bg-[#603000] text-white rounded-[10px] font-bold text-base"
            onClick={handleSubmitAnswer}
            disabled={!answer.trim()}
          >
            Enviar respuesta
          </Button>
        </div>
      </div>
    </div>
  );
};
