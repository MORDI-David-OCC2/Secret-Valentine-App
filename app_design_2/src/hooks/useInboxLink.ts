// src/hooks/useInboxLink.ts
import { useEffect, useState } from "react";
import { openLink } from "../services/api";
import { useSession } from "../contexts/SessionContext";

interface UseInboxLinkResult {
  loading: boolean;
  error: string | null;
  needsPin: boolean;
  inboxId: string | null;
  sessionToken: string | null;
  pinMustBeCreated: boolean;
  needsEmailAssociation: boolean;
}

export function useInboxLink(token: string | null): UseInboxLinkResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [needsPin, setNeedsPin] = useState(false);
  const [pinMustBeCreated, setPinMustBeCreated] = useState(false);

  const [sessionTokenState, setSessionTokenState] = useState<string | null>(null);
  const [inboxIdState, setInboxIdState] = useState<string | null>(null);
  const [needsEmailAssociation, setNeedsEmailAssociation] = useState(false);

  const { setInboxId, setSessionToken, setIsLocked, setIsPinRequired } = useSession();

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      // reset
      setNeedsPin(false);
      setPinMustBeCreated(false);
      setSessionTokenState(null);
      setInboxIdState(null);
      setNeedsEmailAssociation(false);

      try {
        const res = await openLink(token);
        if (cancelled) return;

        setInboxId(res.inboxId);
        setInboxIdState(res.inboxId);

        setIsPinRequired(!!res.pinRequired);
        setNeedsEmailAssociation(!!res.needsEmailAssociation);

        // Must create PIN (first time OR pin_reset)
        if (res.pinMustBeCreated) {
          setPinMustBeCreated(true);
          setSessionTokenState(res.sessionToken || null);
          setIsLocked(false);
          return;
        }

        // Pin exists => locked
        if (res.pinRequired) {
          setNeedsPin(true);
          setIsLocked(true);
          return;
        }

        // No pin required => direct session
        if (res.sessionToken) {
          setSessionToken(res.sessionToken);
          setSessionTokenState(res.sessionToken);
          setIsLocked(false);
          return;
        }

        throw new Error("Unexpected link state");
      } catch (e: any) {
        if (cancelled) return;
        console.error("openLink error:", e);
        setError(e?.message || "Invalid or expired link");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token, setInboxId, setSessionToken, setIsLocked, setIsPinRequired]);

  return {
    loading,
    error,
    needsPin,
    inboxId: inboxIdState,
    sessionToken: sessionTokenState,
    pinMustBeCreated,
    needsEmailAssociation,
  };
}