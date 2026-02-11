import { useEffect, useState } from 'react';
import { openLink } from '../services/api';
import { useSession } from '../contexts/SessionContext';

/**
 * Hook pour gérer l'ouverture d'un lien inbox via token
 * Gère les cas: pas de PIN, PIN requis, erreurs
 */

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
  const { setInboxId, setSessionToken, setIsLocked, setIsPinRequired } = useSession();
  const [inboxId, setInboxIdState] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const handleOpenLink = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await openLink(token);
        
        setInboxId(response.inboxId);
        setInboxIdState(response.inboxId);
        setIsPinRequired(response.pinRequired);

        if (response.pinRequired) {
          // PIN requis mais pas encore défini - forcer la création
          if (response.sessionToken) {
            // Le backend retourne un sessionToken même si PIN requis
            // Cela signifie que c'est la première fois et le PIN doit être créé
            setPinMustBeCreated(true);
            setSessionTokenState(response.sessionToken);
            setIsLocked(false);
          } else {
            // PIN déjà défini - l'utilisateur doit déverrouiller
            setNeedsPin(true);
            setIsLocked(true);
          }
        } else if (response.sessionToken) {
          // Pas de PIN - accès direct
          setSessionToken(response.sessionToken);
          setSessionTokenState(response.sessionToken);
          setIsLocked(false);
        }
      } catch (err: any) {
        console.error('Error opening link:', err);
        setError(err.message || 'Lien invalide ou expiré');
      } finally {
        setLoading(false);
      }
    };

    handleOpenLink();
  }, [token]);

  return { loading, error, needsPin, inboxId, sessionToken: sessionTokenState, pinMustBeCreated };
}