import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface SessionData {
  inboxId: string | null;
  sessionToken: string | null;

  isLocked: boolean;       // true si Passwordrequis mais pas vérifié
  isPinRequired: boolean;  // backend dit "Passwordexiste"
  mustCreatePin: boolean;  // backend dit "Passwordn'existe pas encore"
}

interface SessionContextType {
  session: SessionData;

  setInboxId: (inboxId: string) => void;
  setSessionToken: (token: string | null) => void;
  setIsLocked: (locked: boolean) => void;
  setIsPinRequired: (required: boolean) => void;
  setMustCreatePin: (v: boolean) => void;

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
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
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
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error("Error saving session:", error);
    }
  }, [session]);

  const setInboxId = (inboxId: string) => setSession((prev) => ({ ...prev, inboxId }));
  const setSessionToken = (token: string | null) => setSession((prev) => ({ ...prev, sessionToken: token }));
  const setIsLocked = (locked: boolean) => setSession((prev) => ({ ...prev, isLocked: locked }));
  const setIsPinRequired = (required: boolean) => setSession((prev) => ({ ...prev, isPinRequired: required }));
  const setMustCreatePin = (v: boolean) => setSession((prev) => ({ ...prev, mustCreatePin: v }));

  const unlock = (sessionToken: string) => {
    setSession((prev) => ({
      ...prev,
      sessionToken,
      isLocked: false,
      mustCreatePin: false,
    }));
  };

  const logout = () => {
    setSession(DEFAULT_SESSION);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const isAuthenticated = !!(
    session.inboxId &&
    session.sessionToken &&
    !session.isLocked &&
    !session.mustCreatePin
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
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}