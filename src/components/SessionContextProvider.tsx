"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../integrations/supabase/client";

interface SessionContextType {
  session: Session | null;
  userId: string | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(
  undefined
);

export const SessionContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const setSafeSession = (newSession: Session | null) => {
      setSession((prev) => {
        // evita update se for o mesmo usuário
        if (prev?.user.id === newSession?.user.id) {
          return prev;
        }
        return newSession;
      });
    };

    // Sessão inicial
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSafeSession(data.session);
      setIsLoading(false);
    });

    // Escuta mudanças de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSafeSession(newSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      userId: session?.user.id ?? null,
      isLoading,
    }),
    [session, isLoading]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error(
      "useSession must be used within a SessionContextProvider"
    );
  }
  return context;
};