import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export interface SessionData {
  inboxId: string | null;
  sessionToken: string | null;

  // true si PIN requis mais pas encore vérifié
  isLocked: boolean;

  // backend dit "PIN existe"
  isPinRequired: boolean;

  // backend dit "PIN n'existe pas encore, il faut en créer un"
  mustCreatePin: boolean;
}

export interface SessionContextType {
  session: SessionData;

  setInboxId: (inboxId: string | null) => void;
  setSessionToken: (token: string | null) => void;
  setIsLocked: (locked: boolean) => void;
  setIsPinRequired: (required: boolean) => void;
  setMustCreatePin: (v: boolean) => void;

  /** met la session en mode "déverrouillé" avec un token valide */
  unlock: (sessionToken: string) => void;

  /** reset total */
  logout: () => void;

  /** user “normalement connecté” (pas lock + pas createPin) */
  isAuthenticated: boolean;
}

const STORAGE_KEY = "valentine_session";

const DEFAULT_SESSION: SessionData = {
  inboxId: null,
  sessionToken: null,
  isLocked: false,
  isPinRequired: false,
  mustCreatePin: false,
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return DEFAULT_SESSION;

      const parsed = JSON.parse(stored);

      // forward-compatible + sécurité types
      return {
        ...DEFAULT_SESSION,
        inboxId: typeof parsed?.inboxId === "string" ? parsed.inboxId : null,
        sessionToken: typeof parsed?.sessionToken === "string" ? parsed.sessionToken : null,
        isLocked: !!parsed?.isLocked,
        isPinRequired: !!parsed?.isPinRequired,
        mustCreatePin: !!parsed?.mustCreatePin,
      };
    } catch (e) {
      console.error("Error loading session:", e);
      return DEFAULT_SESSION;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.error("Error saving session:", e);
    }
  }, [session]);

  const setInboxId = (inboxId: string | null) => {
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
      mustCreatePin: false,
    }));
  };

  const logout = () => {
    setSession(DEFAULT_SESSION);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const isAuthenticated = useMemo(() => {
    return !!(
      session.inboxId &&
      session.sessionToken &&
      !session.isLocked &&
      !session.mustCreatePin
    );
  }, [session.inboxId, session.sessionToken, session.isLocked, session.mustCreatePin]);

  const value: SessionContextType = useMemo(
    () => ({
      session,
      setInboxId,
      setSessionToken,
      setIsLocked,
      setIsPinRequired,
      setMustCreatePin,
      unlock,
      logout,
      isAuthenticated,
    }),
    [session, isAuthenticated]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextType {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}