import { useEffect, useState } from "react";
import { openLink } from "../services/api";

interface UseInboxLinkResult {
  loading: boolean;
  error: string | null;

  needsPin: boolean;
  inboxId: string | null;
  sessionToken: string | null;
  pinMustBeCreated: boolean;
  needsEmailAssociation: boolean;

  pinRequired: boolean;
}

export function useInboxLink(token: string | null): UseInboxLinkResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [needsPin, setNeedsPin] = useState(false);
  const [pinMustBeCreated, setPinMustBeCreated] = useState(false);

  const [sessionTokenState, setSessionTokenState] = useState<string | null>(null);
  const [inboxIdState, setInboxIdState] = useState<string | null>(null);
  const [needsEmailAssociation, setNeedsEmailAssociation] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      setNeedsPin(false);
      setPinMustBeCreated(false);
      setSessionTokenState(null);
      setInboxIdState(null);
      setNeedsEmailAssociation(false);
      setPinRequired(false);

      try {
        const res = await openLink(token);
        if (cancelled) return;

        setInboxIdState(res.inboxId);
        setPinRequired(!!res.pinRequired);
        setNeedsEmailAssociation(!!res.needsEmailAssociation);

        if (res.pinMustBeCreated) {
          setPinMustBeCreated(true);
          setSessionTokenState(res.sessionToken || null);
          setNeedsPin(false);
          return;
        }

        if (res.pinRequired) {
          setNeedsPin(true);
          setSessionTokenState(null);
          return;
        }

        if (res.sessionToken) {
          setSessionTokenState(res.sessionToken);
          setNeedsPin(false);
          return;
        }

        throw new Error("Unexpected link state");
      } catch (e: any) {
        if (cancelled) return;
        console.error("openLink error:", e);
        setError(e?.message || "Lien invalide ou expiré");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return {
    loading,
    error,
    needsPin,
    inboxId: inboxIdState,
    sessionToken: sessionTokenState,
    pinMustBeCreated,
    needsEmailAssociation,
    pinRequired,
  };
}