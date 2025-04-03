import React from 'react';
import { Loader2 } from "lucide-react";

export const ReadingOverlay = () => (
  <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
    <Loader2 className="h-8 h-8 animate-spin text-white mb-4" />
    <p className="text-white text-lg text-center px-4">
      El moderador está leyendo vuestras burradas
    </p>
  </div>
); 