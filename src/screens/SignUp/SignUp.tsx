import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export const SignUp = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    // Validaciones iniciales
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError("Por favor, rellena todos los campos");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor, introduce un email válido");
      return;
    }

    // Validar longitud de la contraseña
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    // Verificar cooldown
    const lastAttemptTime = localStorage.getItem('lastSignUpAttempt');
    const now = Date.now();
    const COOLDOWN_TIME = 60000; // 1 minuto

    if (lastAttemptTime && (now - parseInt(lastAttemptTime)) < COOLDOWN_TIME) {
      const remainingTime = Math.ceil((COOLDOWN_TIME - (now - parseInt(lastAttemptTime))) / 1000);
      setError(`Por favor, espera ${remainingTime} segundos antes de intentarlo de nuevo`);
      return;
    }

    setIsLoading(true);
    try {
      // Registrar intento
      localStorage.setItem('lastSignUpAttempt', now.toString());

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (signUpError) {
        if (signUpError.message.includes("rate limit")) {
          setError("Por favor, espera un minuto antes de intentarlo de nuevo");
          return;
        }
        throw signUpError;
      }

      if (signUpData.user) {
        console.log('✅ Usuario creado exitosamente:', {
          email,
          username: username.trim()
        });

        // Navegar directamente sin intentar login
        navigate("/");
      }

    } catch (err) {
      console.error("Error:", err);
      setError("Error al crear la cuenta. Por favor, inténtalo de nuevo");
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
            Crea tu cuenta para jugar
            <span className="float-right">2/2</span>
          </h2>

          <p className="text-[#131309] text-base mb-6">
            Introduce tus datos de acceso.
          </p>

          <div className="space-y-4">
            <Input
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-12 px-3 py-2 rounded-[10px] border-[#13130940]"
            />

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
              onClick={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? "Creando cuenta..." : "Vamos al lío"}
            </Button>
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