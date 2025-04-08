import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface PlayerContextType {
  playerId: string | null;
  playerName: string | null;
  setPlayerInfo: (id: string, name: string) => void;
}

const PlayerContext = createContext<PlayerContextType>({
  playerId: null,
  playerName: null,
  setPlayerInfo: () => {},
});

export const usePlayer = () => useContext(PlayerContext);

interface PlayerProviderProps {
  children: ReactNode;
}

export const PlayerProvider = ({ children }: PlayerProviderProps) => {
  const [playerId, setPlayerId] = useState<string | null>(
    localStorage.getItem('bullshit_player_id')
  );
  const [playerName, setPlayerName] = useState<string | null>(
    localStorage.getItem('bullshit_player_name')
  );

  const setPlayerInfo = (id: string, name: string) => {
    setPlayerId(id);
    setPlayerName(name);
    
    localStorage.setItem('bullshit_player_id', id);
    localStorage.setItem('bullshit_player_name', name);
  };

  return (
    <PlayerContext.Provider value={{ 
      playerId, 
      playerName, 
      setPlayerInfo 
    }}>
      {children}
    </PlayerContext.Provider>
  );
}; 