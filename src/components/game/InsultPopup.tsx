import React from 'react';
import type { Player } from "../../lib/types";

interface InsultPopupProps {
  moderator: Player | null;
  insultoActual: string;
  onClose: () => void;
}

export const InsultPopup = ({ moderator, insultoActual, onClose }: InsultPopupProps) => (
  <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-50 animate-fadeIn">
    <div className="bg-white rounded-[20px] p-8 mx-4 w-full max-w-[350px] relative shadow-xl animate-scaleIn">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-[#131309] hover:text-[#131309]/70 w-8 h-8 flex items-center justify-center rounded-full bg-[#E7E7E6] hover:bg-[#D1D1D0] transition-colors"
      >
        ✕
      </button>
      
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-[#CB1517] rounded-full flex items-center justify-center mb-4 animate-pulse">
          <span className="text-white text-3xl">🔥</span>
        </div>
        
        <p className="text-[#131309] text-base mb-4 text-center">
          Un mensaje de parte de <span className="font-bold">{moderator?.name}</span>, el moderador...
        </p>
        
        <div className="bg-[#131309] rounded-[15px] p-6 w-full">
          <p className="text-white text-xl font-bold text-center italic">
            "{insultoActual}"
          </p>
        </div>
      </div>
    </div>
  </div>
); 