import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { supabase } from "../../lib/supabase";

export const ValidateCode = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleValidateCode = async () => {
    if (!code.trim()) {
      setError("Por favor, introduce el código de acceso");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Verificar el código
      const { data: accessCode, error: codeError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', code.trim())
        .single();

      if (codeError || !accessCode) {
        setError("Código no válido");
        return;
      }

      if (accessCode.is_used) {
        setError("Este código ya ha sido utilizado");
        return;
      }

      // 2. Generar token único para signup
      const signupToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token válido por 1 hora

      // 3. Actualizar el código con el token
      const { error: updateError } = await supabase
        .from('access_codes')
        .update({
          signup_token: signupToken,
          signup_token_expires_at: expiresAt.toISOString()
        })
        .eq('id', accessCode.id);

      if (updateError) throw updateError;

      // 4. Redirigir a signup con el token
      navigate(`/signup/${signupToken}`);

    } catch (err) {
      console.error('Error:', err);
      setError("Error validando el código. Por favor, inténtalo de nuevo");
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
            Validar código de acceso
            <span className="float-right">1/2</span>
          </h2>

          <p className="text-[#131309] text-base mb-6">
            Introduce el código que encontrarás en la caja del juego.
          </p>

          <div className="space-y-4">
            <Input
              placeholder="Código de acceso"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError("");
              }}
              className="h-12 px-3 py-2 rounded-[10px] border-[#13130940] uppercase"
              maxLength={12}
            />

            {error && (
              <p className="text-[#CB1517] text-sm">{error}</p>
            )}

            <Button
              className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base"
              onClick={handleValidateCode}
              disabled={isLoading}
            >
              {isLoading ? "Validando..." : "Validar código"}
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