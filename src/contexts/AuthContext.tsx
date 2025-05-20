import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, invitationCode: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar usuario actual al montar
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null);
      setLoading(false);
    });

    // Suscribirse a cambios de sesión
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /**
   * Registra un nuevo usuario validando primero su código de invitación.
   * 1. Comprueba que el código exista y no haya sido usado.
   * 2. Ejecuta el registro con Supabase Auth.
   * 3. Marca el código como usado por el nuevo usuario.
   */
  const signUp = async (
    email: string,
    password: string,
    username: string,
    invitationCode: string
  ) => {
    // 1) Validar código de invitación
    const { data: codeData, error: codeError } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('code', invitationCode)
      .is('used_by', null)
      .single();

    if (codeError || !codeData) {
      throw new Error('Código de invitación inválido o ya usado');
    }

    // 2) Registrar usuario
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });

    if (signUpError) throw signUpError;

    const newUser = signUpData.user;

    // 3) Marcar código como usado (si el usuario se creó correctamente)
    if (newUser) {
      const { error: updateError } = await supabase
        .from('invitation_codes')
        .update({ used_by: newUser.id, used_at: new Date().toISOString() })
        .eq('id', codeData.id);

      if (updateError) {
        console.error('No se pudo marcar el código como usado:', updateError);
        throw new Error('No se pudo registrar el código de invitación');
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value: AuthContextValue = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 