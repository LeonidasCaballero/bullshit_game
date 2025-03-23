import { useLocation, useNavigate } from "react-router-dom";

export const SignUpConfirm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const message = location.state?.message;

  return (
    <div className="bg-black min-h-screen flex justify-center">
      <div className="w-full max-w-[375px] flex flex-col items-center">
        <h1 className="[font-family:'Londrina_Solid'] text-white text-[56px] mt-12">
          BULLSHIT
        </h1>

        <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6 mb-4">
          <h2 className="text-[#131309] text-xl font-bold mb-4">
            Confirma tu email
          </h2>

          <p className="text-[#131309] text-base mb-6">
            {message || `Te hemos enviado un email a ${email}. Por favor, revisa tu bandeja de entrada y confirma tu cuenta.`}
          </p>

          <Button
            className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base"
            onClick={() => navigate("/")}
          >
            Volver al inicio
          </Button>
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