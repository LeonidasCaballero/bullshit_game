import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Frame } from "./screens/Frame";
import { ShareGame } from "./screens/ShareGame";
import { JoinGame } from "./screens/JoinGame";
import { GameLobby } from "./screens/GameLobby";
import { GameRound } from "./screens/GameRound";
import { RoundIntro } from "./screens/RoundIntro";
import { GameScores } from "./screens/GameScores";
import { NextRound } from "./screens/NextRound";
import { SupabaseProvider } from "./contexts/SupabaseContext";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <SupabaseProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Frame />} />
          <Route path="/share/:gameId" element={<ShareGame />} />
          <Route path="/game/:gameId" element={<JoinGame />} />
          <Route path="/game/:gameId/lobby" element={<GameLobby />} />
          <Route path="/game/:gameId/round/intro" element={<RoundIntro />} />
          <Route path="/game/:gameId/round" element={<GameRound />} />
          <Route path="/game/:gameId/scores" element={<GameScores />} />
          <Route path="/game/:gameId/next-round" element={<NextRound />} />
        </Routes>
      </Router>
    </SupabaseProvider>
  </StrictMode>
);