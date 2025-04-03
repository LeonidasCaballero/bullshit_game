import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    // Mostrar indicador de carga mientras se verifica la autenticación
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E7E7E6]">
        <p className="text-[#131309] text-lg">Cargando...</p>
      </div>
    );
  }
  
  if (!user) {
    // Redirigir a login si no hay usuario autenticado
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}; 