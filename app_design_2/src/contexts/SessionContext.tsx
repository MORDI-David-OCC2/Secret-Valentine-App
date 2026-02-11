import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Context pour gérer la session utilisateur (inbox + sessionToken)
 * Persiste les données dans localStorage
 */

interface SessionData {
  inboxId: string | null;
  sessionToken: string | null;
  isLocked: boolean; // true si PIN requis mais pas encore vérifié
  isPinRequired: boolean;
}

interface SessionContextType {
  session: SessionData;
  setInboxId: (inboxId: string) => void;
  setSessionToken: (token: string | null) => void;
  setIsLocked: (locked: boolean) => void;
  setIsPinRequired: (required: boolean) => void;
  unlock: (sessionToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const STORAGE_KEY = 'valentine_session';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData>(() => {
    // Charger depuis localStorage au démarrage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
    return {
      inboxId: null,
      sessionToken: null,
      isLocked: false,
      isPinRequired: false
    };
  });

  // Persister dans localStorage à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }, [session]);

  const setInboxId = (inboxId: string) => {
    setSession(prev => ({ ...prev, inboxId }));
  };

  const setSessionToken = (token: string | null) => {
    setSession(prev => ({ ...prev, sessionToken: token }));
  };

  const setIsLocked = (locked: boolean) => {
    setSession(prev => ({ ...prev, isLocked: locked }));
  };

  const setIsPinRequired = (required: boolean) => {
    setSession(prev => ({ ...prev, isPinRequired: required }));
  };

  const unlock = (sessionToken: string) => {
    setSession(prev => ({
      ...prev,
      sessionToken,
      isLocked: false
    }));
  };

  const logout = () => {
    setSession({
      inboxId: null,
      sessionToken: null,
      isLocked: false,
      isPinRequired: false
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  const isAuthenticated = !!(
    session.inboxId && 
    session.sessionToken && 
    !session.isLocked
  );

  return (
    <SessionContext.Provider
      value={{
        session,
        setInboxId,
        setSessionToken,
        setIsLocked,
        setIsPinRequired,
        unlock,
        logout,
        isAuthenticated
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
