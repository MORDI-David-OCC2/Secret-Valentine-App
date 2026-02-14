// src/hooks/useInboxLink.ts
import { useEffect, useState } from "react";
import { openLink } from "../services/api";

interface UseInboxLinkResult {
  loading: boolean;
  error: string | null;

  // inbox info from the link
  inboxId: string | null;

  // backend state
  needsPin: boolean;           // pin exists => user must enter pin
  pinMustBeCreated: boolean;   // first time or pin reset => must create pin now
  sessionToken: string | null; // provided when backend created one (setup/reset or unlocked)
  needsEmailAssociation: boolean;
}

export function useInboxLink(token: string | null): UseInboxLinkResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inboxId, setInboxId] = useState<string | null>(null);
  const [needsPin, setNeedsPin] = useState(false);
  const [pinMustBeCreated, setPinMustBeCreated] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [needsEmailAssociation, setNeedsEmailAssociation] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      // reset local state
      setInboxId(null);
      setNeedsPin(false);
      setPinMustBeCreated(false);
      setSessionToken(null);
      setNeedsEmailAssociation(false);

      try {
        const res = await openLink(token);
        if (cancelled) return;

        setInboxId(res.inboxId);
        setNeedsEmailAssociation(!!res.needsEmailAssociation);

        // If backend says user must create pin (first time OR pin reset)
        if (res.pinMustBeCreated) {
          setPinMustBeCreated(true);
          setNeedsPin(false);
          setSessionToken(res.sessionToken || null);
          return;
        }

        // Otherwise, pin exists => locked until pin entry
        if (res.pinRequired) {
          setNeedsPin(true);
          setPinMustBeCreated(false);
          setSessionToken(null); // usually null here
          return;
        }

        // No pin required => direct access (should come with sessionToken)
        if (res.sessionToken) {
          setNeedsPin(false);
          setPinMustBeCreated(false);
          setSessionToken(res.sessionToken);
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
    inboxId,
    needsPin,
    pinMustBeCreated,
    sessionToken,
    needsEmailAssociation,
  };
}