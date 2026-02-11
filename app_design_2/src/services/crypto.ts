/**
 * Service de déchiffrement côté client
 * Pour déchiffrer les messages reçus du backend
 * 
 * Note: Le chiffrement se fait côté serveur (Netlify Functions)
 * Le client ne fait que déchiffrer avec la clé fournie par la session
 */

/**
 * Déchiffre un message avec la clé inbox
 * 
 * @param inboxKey - Clé de l'inbox (32 bytes, base64)
 * @param dekWrapped - DEK chiffrée
 * @param bodyEnc - Corps du message chiffré
 * @returns Message déchiffré en texte
 */
export async function decryptMessage(
  inboxKey: string,
  dekWrapped: { alg: string; iv: string; ct: string; tag: string },
  bodyEnc: { alg: string; iv: string; ct: string; tag: string }
): Promise<string> {
  try {
    // 1. Convertir la clé inbox de base64 vers CryptoKey
    const keyBuffer = Uint8Array.from(atob(inboxKey), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // 2. Déchiffrer le DEK (Data Encryption Key)
    const dekDecrypted = await decryptAESGCM(cryptoKey, dekWrapped);

    // 3. Importer le DEK comme CryptoKey
    const dekKey = await crypto.subtle.importKey(
      'raw',
      dekDecrypted,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // 4. Déchiffrer le message avec le DEK
    const messageBuffer = await decryptAESGCM(dekKey, bodyEnc);

    // 5. Convertir en texte
    const decoder = new TextDecoder();
    return decoder.decode(messageBuffer);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Impossible de déchiffrer le message');
  }
}

/**
 * Fonction helper pour déchiffrer avec AES-GCM
 */
async function decryptAESGCM(
  key: CryptoKey,
  wrapped: { iv: string; ct: string; tag: string }
): Promise<Uint8Array> {
  // Convertir IV, ciphertext et tag de base64
  const iv = Uint8Array.from(atob(wrapped.iv), c => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(wrapped.ct), c => c.charCodeAt(0));
  const tag = Uint8Array.from(atob(wrapped.tag), c => c.charCodeAt(0));

  // Combiner ciphertext + tag (format attendu par Web Crypto API)
  const combined = new Uint8Array(ct.length + tag.length);
  combined.set(ct);
  combined.set(tag, ct.length);

  // Déchiffrer
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    combined
  );

  return new Uint8Array(decrypted);
}

/**
 * Vérifie si le navigateur supporte les APIs crypto nécessaires
 */
export function isCryptoSupported(): boolean {
  return !!(
    window.crypto &&
    window.crypto.subtle &&
    window.crypto.subtle.decrypt &&
    window.crypto.subtle.importKey
  );
}
