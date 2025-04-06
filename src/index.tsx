import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Frame } from "./screens/Frame";
import { ShareGame } from "./screens/ShareGame";
import { JoinGame } from "./screens/JoinGame";
import { GameLobby } from "./screens/GameLobby";
import { GameRound } from "./screens/GameRound";
import { RoundIntro } from "./screens/RoundIntro";
import { GameScores } from "./screens/GameScores";
import { NextRound } from "./screens/NextRound";
import { Login } from "./screens/Login";
import { SignUp } from "./screens/SignUp";
import { ValidateCode } from "./screens/ValidateCode";
import { SupabaseProvider } from "./contexts/SupabaseContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <SupabaseProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Ruta base redirige a login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Rutas de autenticación */}
            <Route path="/login" element={<Login />} />
            <Route path="/validate-code" element={<ValidateCode />} />
            <Route path="/signup/:token" element={<SignUp />} />
            
            {/* Ruta protegida para crear juego */}
            <Route path="/create-game" element={
              <ProtectedRoute>
                <Frame />
              </ProtectedRoute>
            } />
            
            {/* Rutas de juego */}
            <Route path="/share/:gameId" element={<ShareGame />} />
            <Route path="/game/:gameId" element={<JoinGame />} />
            <Route path="/game/:gameId/lobby" element={<GameLobby />} />
            <Route path="/game/:gameId/round/intro" element={<RoundIntro />} />
            <Route path="/game/:gameId/round" element={<GameRound />} />
            <Route path="/game/:gameId/scores" element={<GameScores />} />
            <Route path="/game/:gameId/next-round" element={<NextRound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </SupabaseProvider>
  </StrictMode>
);