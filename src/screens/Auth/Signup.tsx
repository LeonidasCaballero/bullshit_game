import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";

export const Signup = (): JSX.Element => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signUp(email.trim(), password, username.trim());
      alert('Registro correcto. Revisa tu email para confirmar la cuenta antes de iniciar sesión.');
      navigate('/login', { replace: true });
    } catch (err: any) {
      setError(err.message ?? "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center justify-center px-4">
      <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mb-8">BULLSHIT</h1>
      <Card className="w-full max-w-[327px]">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-[#131309] text-xl font-bold">Crear cuenta</h2>
          <Input
            type="text"
            placeholder="Nombre de usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-12"
          />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12"
          />
          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12"
          />
          {error && <p className="text-[#CB1517] text-sm">{error}</p>}
          <Button
            className="w-full h-12 bg-[#804000] hover:bg-[#603000] rounded-[10px] font-bold text-base"
            onClick={handleSubmit}
            disabled={loading || !username.trim()}
          >
            Registrarse
          </Button>
          <p className="text-sm text-center">
            ¿Ya tienes cuenta? <Link to="/login" className="text-[#804000] font-bold">Inicia sesión</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}; 