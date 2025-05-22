import React from "react";
import type { AnswerOption, ExitingCard } from "../../../lib/types"; // Adjusted path

interface AnswerCardStackProps {
  shuffledAnswers: AnswerOption[];
  exitingCards: ExitingCard[];
  slideDirection: "left" | "right";
  currentAnswerIndex: number;
}

export const AnswerCardStack: React.FC<AnswerCardStackProps> = ({
  shuffledAnswers,
  exitingCards,
  slideDirection,
  currentAnswerIndex,
}) => {
  return (
    <div className="relative h-[300px]">
      {exitingCards.map((card) => (
        <div
          key={`exiting-${card.index}`}
          className={`absolute top-0 left-0 right-0 w-full h-[300px] ${
            slideDirection === "left" ? "animate-exitLeft" : "animate-exitRight"
          }`}
          style={{
            zIndex: 100 + card.index,
            transform: `rotate(${(card.index % 3 - 1) * 2}deg)`,
          }}
        >
          <div className="bg-white rounded-[20px] p-6 relative shadow-md h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[#131309] text-xl">
                Opción {card.index + 1} de {shuffledAnswers.length}
              </p>
            </div>
            <div className="bg-white rounded-[10px] p-4 h-[200px]">
              <p
                className="text-[#131309] text-2xl"
                style={{ fontFamily: "Caveat, cursive" }}
              >
                {card.content}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Carta actual con animación */}
      <div
        className={`absolute top-0 left-0 right-0 w-full h-[300px] ${
          slideDirection === "left" ? "animate-slideLeft" : "animate-slideRight"
        }`}
        style={{
          zIndex: currentAnswerIndex + 1,
          transform: `rotate(${(currentAnswerIndex % 3 - 1) * 2}deg)`,
        }}
      >
        <div className="bg-white rounded-[20px] p-6 relative shadow-md h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[#131309] text-xl">
              Opción {currentAnswerIndex + 1} de {shuffledAnswers.length}
            </p>
          </div>
          <div className="bg-white rounded-[10px] p-4 h-[200px]">
            <p
              className="text-[#131309] text-2xl"
              style={{ fontFamily: "Caveat, cursive" }}
            >
              {shuffledAnswers[currentAnswerIndex].content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 