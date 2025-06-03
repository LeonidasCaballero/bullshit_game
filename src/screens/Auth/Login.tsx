import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";

export const Login = (): JSX.Element => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate("/");
    } catch (err: any) {
      if (err?.message?.includes('Email not confirmed')) {
        setError('Confirma tu email antes de iniciar sesión. Revisa tu bandeja.');
      } else if (err?.message?.includes('Invalid login credentials')) {
        setError('Credenciales incorrectas');
      } else {
        setError(err.message ?? 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center justify-center px-4">
      <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mb-8">BULLSHIT</h1>
      <Card className="w-full max-w-[327px] bg-white">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-[#131309] text-xl font-bold">Iniciar sesión</h2>
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
            disabled={loading}
          >
            Entrar
          </Button>
          <p className="text-sm text-center">
            ¿No tienes cuenta? <Link to="/signup" className="text-[#804000] font-bold">Regístrate</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}; 