import { useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";

export const NextRound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { gameId } = useParams();

  useEffect(() => {
    // Navegar a la intro después de un breve momento
    const timer = setTimeout(() => {
      navigate(`/game/${gameId}/round/intro`, {
        state: { 
          playerName: location.state?.playerName,
          roundNumber: location.state?.roundNumber,
          roundId: location.state?.roundId,
          moderatorId: location.state?.moderatorId,
          category: location.state?.category
        }
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [gameId, navigate, location.state]);

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center justify-center">
      <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309]">
        Siguiente Ronda
      </h1>
    </div>
  );
}; 