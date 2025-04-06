import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Por favor, rellena todos los campos");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      if (data.user) {
        console.log('✅ Login exitoso');
        navigate("/create-game");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Email o contraseña incorrectos. Por favor, inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-black min-h-screen flex justify-center">
      <div className="w-full max-w-[375px] flex flex-col items-center">
        <h1 className="[font-family:'Londrina_Solid'] text-white text-[56px] mt-12">
          BULLSHIT
        </h1>

        <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6 mb-4">
          <h2 className="text-[#131309] text-xl font-bold mb-4">
            Iniciar sesión
          </h2>

          <p className="text-[#131309] text-base mb-6">
            Introduce tus datos de acceso.
          </p>

          <div className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 px-3 py-2 rounded-[10px] border-[#13130940]"
            />

            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 px-3 py-2 rounded-[10px] border-[#13130940]"
            />

            {error && (
              <p className="text-[#CB1517] text-sm">{error}</p>
            )}

            <Button
              className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>

            <p className="text-center text-sm mt-4">
              ¿No tienes cuenta? {" "}
              <Link to="/validate-code" className="text-[#CB1517] hover:underline">
                Regístrate
              </Link>
            </p>
          </div>
        </div>

        {/* Imagen del toro */}
        <div className="w-full">
          <img 
            src="/bull.png" 
            alt="Bull mascot"
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}; 