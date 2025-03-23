import { useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export const NextRound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { gameId } = useParams();

  useEffect(() => {
    // Esperar un momento y navegar a la intro
    const timer = setTimeout(() => {
      navigate(`/game/${gameId}/round/intro`, {
        state: location.state
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [gameId, navigate, location.state]);

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center justify-center">
      <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309]">
        Siguiente Ronda
      </h1>
      <p className="text-[#131309] text-lg mt-4">Preparando la ronda...</p>
    </div>
  );
}; 