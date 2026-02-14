import { useEffect, useState } from "react";
import { openLink } from "../services/api";
import { useSession } from "../contexts/SessionContext";

interface UseInboxLinkResult {
  loading: boolean;
  error: string | null;

  // if pin exists => user must enter pin
  needsPin: boolean;

  // inbox info
  inboxId: string | null;

  // session token (only when backend created one for setup/pin reset)
  sessionToken: string | null;

  // true when user MUST create a PIN now (first time or pin reset)
  pinMustBeCreated: boolean;

  // NEW: show email field in FirstPinSetup (share/instagram)
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

        setInboxId(res.inboxId);
        setInboxIdState(res.inboxId);

        // pin exists?
        setIsPinRequired(res.pinRequired);

        // NEW
        setNeedsEmailAssociation(!!res.needsEmailAssociation);

        // If backend says user must create pin (first time OR pin_reset)
        if (res.pinMustBeCreated) {
          setPinMustBeCreated(true);

          // backend should always provide a sessionToken for setup/reset
          setSessionTokenState(res.sessionToken || null);

          // allow setup page (not locked)
          setIsLocked(false);
          return;
        }

        // Otherwise, pin exists => locked until pin entry
        if (res.pinRequired) {
          setNeedsPin(true);
          setIsLocked(true);
          return;
        }

        // No pin required => direct access (should come with sessionToken)
        if (res.sessionToken) {
          setSessionToken(res.sessionToken);
          setSessionTokenState(res.sessionToken);
          setIsLocked(false);
          return;
        }

        // fallback
        throw new Error("Unexpected link state");
      } catch (e: any) {
        console.error("openLink error:", e);
        setError(e?.message || "Lien invalide ou expiré");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

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