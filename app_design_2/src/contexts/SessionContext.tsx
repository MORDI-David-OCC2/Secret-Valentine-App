import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

/**
 * Context pour gérer la session utilisateur (inbox + sessionToken)
 * Persiste les données dans localStorage
 */

interface SessionData {
  inboxId: string | null;
  sessionToken: string | null;
  isLocked: boolean;       // true si PIN requis mais pas encore vérifié
  isPinRequired: boolean;  // backend dit "PIN existe"
  mustCreatePin: boolean;  // ✅ NEW: backend dit "PIN n'existe pas encore, il faut en créer un"
}

interface SessionContextType {
  session: SessionData;
  setInboxId: (inboxId: string) => void;
  setSessionToken: (token: string | null) => void;
  setIsLocked: (locked: boolean) => void;
  setIsPinRequired: (required: boolean) => void;
  setMustCreatePin: (v: boolean) => void; // ✅ NEW
  unlock: (sessionToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const STORAGE_KEY = "valentine_session";

const DEFAULT_SESSION: SessionData = {
  inboxId: null,
  sessionToken: null,
  isLocked: false,
  isPinRequired: false,
  mustCreatePin: false,
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // ✅ forward-compatible: si l'ancien storage n'a pas mustCreatePin
        return {
          ...DEFAULT_SESSION,
          ...parsed,
          mustCreatePin: !!parsed.mustCreatePin,
        };
      }
    } catch (error) {
      console.error("Error loading session:", error);
    }
    return DEFAULT_SESSION;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error("Error saving session:", error);
    }
  }, [session]);

  const setInboxId = (inboxId: string) => {
    setSession((prev) => ({ ...prev, inboxId }));
  };

  const setSessionToken = (token: string | null) => {
    setSession((prev) => ({ ...prev, sessionToken: token }));
  };

  const setIsLocked = (locked: boolean) => {
    setSession((prev) => ({ ...prev, isLocked: locked }));
  };

  const setIsPinRequired = (required: boolean) => {
    setSession((prev) => ({ ...prev, isPinRequired: required }));
  };

  const setMustCreatePin = (v: boolean) => {
    setSession((prev) => ({ ...prev, mustCreatePin: v }));
  };

  const unlock = (sessionToken: string) => {
    setSession((prev) => ({
      ...prev,
      sessionToken,
      isLocked: false,
      mustCreatePin: false, // ✅ une fois "unlock", on n'est plus en mode "création requise"
    }));
  };

  const logout = () => {
    setSession(DEFAULT_SESSION);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isAuthenticated = !!(
    session.inboxId &&
    session.sessionToken &&
    !session.isLocked &&
    !session.mustCreatePin // ✅ si on doit créer un PIN, on ne considère pas authentifié "normalement"
  );

  return (
    <SessionContext.Provider
      value={{
        session,
        setInboxId,
        setSessionToken,
        setIsLocked,
        setIsPinRequired,
        setMustCreatePin,
        unlock,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}