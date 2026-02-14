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
  isPinReset: boolean;
}

export function useInboxLink(token: string | null): UseInboxLinkResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [needsPin, setNeedsPin] = useState(false);
  const [pinMustBeCreated, setPinMustBeCreated] = useState(false);

  const [sessionTokenState, setSessionTokenState] = useState<string | null>(null);
  const [inboxIdState, setInboxIdState] = useState<string | null>(null);
  const [needsEmailAssociation, setNeedsEmailAssociation] = useState(false);
  const [isPinReset, setIsPinReset] = useState(false);

  const { setInboxId, setSessionToken, setIsLocked, setIsPinRequired } = useSession();

  useEffect(() => {
    if (!token) return;

    const run = async () => {
      setLoading(true);
      setError(null);

      setNeedsPin(false);
      setPinMustBeCreated(false);
      setSessionTokenState(null);
      setInboxIdState(null);
      setNeedsEmailAssociation(false);
      setIsPinReset(false);

      try {
        const res = await openLink(token);

        // ✅ Always store inboxId in session (fixes "missing inboxId" in PIN screen)
        setInboxId(res.inboxId);
        setInboxIdState(res.inboxId);

        setIsPinRequired(!!res.pinRequired);
        setNeedsEmailAssociation(!!res.needsEmailAssociation);
        setIsPinReset(!!res.isPinReset);

        // If setup/reset: we are NOT locked and we should have a setup sessionToken
        if (res.pinMustBeCreated) {
          setPinMustBeCreated(true);
          setSessionTokenState(res.sessionToken || null);

          // optional: store in context too (useful for later calls)
          if (res.sessionToken) setSessionToken(res.sessionToken);

          setIsLocked(false);
          return;
        }

        // If PIN exists => go to PIN screen (locked)
        if (res.pinRequired) {
          setNeedsPin(true);
          setIsLocked(true);
          return;
        }

        // No PIN => direct access (must have session token)
        if (res.sessionToken) {
          setSessionToken(res.sessionToken);
          setSessionTokenState(res.sessionToken);
          setIsLocked(false);
          return;
        }

        throw new Error("Unexpected link state");
      } catch (e: any) {
        console.error("openLink error:", e);
        setError(e?.message || "Invalid or expired link");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token, setInboxId, setSessionToken, setIsLocked, setIsPinRequired]);

  return {
    loading,
    error,
    needsPin,
    inboxId: inboxIdState,
    sessionToken: sessionTokenState,
    pinMustBeCreated,
    needsEmailAssociation,
    isPinReset,
  };
}