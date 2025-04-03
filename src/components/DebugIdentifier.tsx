import { useState } from 'react';

interface DebugIdentifierProps {
  screen: string;
  state?: string;
  extraInfo?: Record<string, any>;
}

export const DebugIdentifier = ({ 
  screen, 
  state = 'default', 
  extraInfo = {} 
}: DebugIdentifierProps) => {
  // No mostrar en producción
  if (import.meta.env.PROD) return null;
  
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div 
      className="fixed top-1 right-1 z-50 bg-black/70 text-white text-xs rounded p-1 font-mono"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="cursor-pointer">
        {screen}/{state}
      </div>
      
      {expanded && Object.keys(extraInfo).length > 0 && (
        <div className="mt-1 border-t border-white/20 pt-1">
          {Object.entries(extraInfo).map(([key, value]) => (
            <div key={key} className="whitespace-nowrap">
              <span className="opacity-70">{key}:</span> {
                typeof value === 'object' 
                  ? JSON.stringify(value).substring(0, 20) + '...' 
                  : String(value)
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 