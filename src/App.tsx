import React from 'react';
import { Route } from 'react-router-dom';
import RoundIntro from './screens/RoundIntro/RoundIntro';
import GameRound from './screens/GameRound/GameRound';

const App: React.FC = () => {
  return (
    <Route path="/game/:gameId/round/intro" element={<RoundIntro />} />
    <Route path="/game/:gameId/round" element={<GameRound />} />
  );
};

export default App; 