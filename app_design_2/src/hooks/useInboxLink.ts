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
}

export function useInboxLink(token: string | null): UseInboxLinkResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [needsPin, setNeedsPin] = useState(false);
  const [pinMustBeCreated, setPinMustBeCreated] = useState(false);

  const [sessionTokenState, setSessionTokenState] = useState<string | null>(null);
  const [inboxId, setInboxIdState] = useState<string | null>(null);

  const { setInboxId, setSessionToken, setIsLocked, setIsPinRequired } = useSession();

  useEffect(() => {
    if (!token) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      setNeedsPin(false);
      setPinMustBeCreated(false);
      setSessionTokenState(null);

      try {
        const res = await openLink(token);

        setInboxId(res.inboxId);
        setInboxIdState(res.inboxId);

        // pinRequired = "un PIN existe déjà"
        setIsPinRequired(!!res.pinRequired);

        // ✅ 1) Première fois => création obligatoire
        if (res.pinMustBeCreated) {
          setPinMustBeCreated(true);

          // le backend doit fournir un sessionToken pour permettre setPin
          if (res.sessionToken) {
            setSessionTokenState(res.sessionToken);
            setSessionToken(res.sessionToken);
          }

          setIsLocked(false);
          return;
        }

        // ✅ 2) PIN existe => il faut unlock (pas de sessionToken)
        if (res.pinRequired) {
          setNeedsPin(true);
          setIsLocked(true);
          return;
        }

        // ✅ 3) Cas fallback: pas de PIN + session directe
        if (res.sessionToken) {
          setSessionTokenState(res.sessionToken);
          setSessionToken(res.sessionToken);
          setIsLocked(false);
          return;
        }

        // Si on arrive ici, c'est incohérent
        setError("Invalid session state");
      } catch (e: any) {
        console.error("Error opening link:", e);
        setError(e?.message || "Lien invalide ou expiré");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  return { loading, error, needsPin, inboxId, sessionToken: sessionTokenState, pinMustBeCreated };
}