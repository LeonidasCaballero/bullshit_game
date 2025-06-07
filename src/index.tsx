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
import { FinalScores } from "./screens/FinalScores";
import { SupabaseProvider } from "./contexts/SupabaseContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./screens/Auth/Login";
import { Signup } from "./screens/Auth/Signup";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<ProtectedRoute><Frame /></ProtectedRoute>} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/share/:gameId" element={<ShareGame />} />
              <Route path="/game/:gameId" element={<JoinGame />} />
              <Route path="/game/:gameId/lobby" element={<GameLobby />} />
              <Route path="/game/:gameId/round/intro" element={<RoundIntro />} />
              <Route path="/game/:gameId/round" element={<GameRound />} />
              <Route path="/game/:gameId/scores" element={<GameScores />} />
              <Route path="/game/:gameId/next-round" element={<NextRound />} />
              <Route path="/game/:gameId/final" element={<FinalScores />} />
            </Routes>
          </Router>
        </AuthProvider>
      </SupabaseProvider>
    </QueryClientProvider>
  </StrictMode>
);