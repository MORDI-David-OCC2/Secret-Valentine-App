import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useSession } from "../contexts/SessionContext";
import AppFrame from "./ui/AppFrame";
import { savePushSub, getInboxMeta, updateInboxPin } from "../services/api";
import { urlBase64ToUint8Array } from "../services/push";

type PageName = "home" | "letters" | "compose" | "settings" | "credits" | "claim";

async function enableNotifications() {
  if (!("serviceWorker" in navigator)) throw new Error("No service worker");
  if (!("PushManager" in window)) throw new Error("No PushManager");

  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permission not granted");

  const reg = await navigator.serviceWorker.ready;

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
  if (!vapidPublicKey) throw new Error("Missing VITE_VAPID_PUBLIC_KEY");

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  return sub;
}

async function getExistingPushSub(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

interface SettingsPageProps {
  onBack: () => void;
  language: "en" | "fr";
  onLanguageChange: (lang: "en" | "fr") => void;

  // keep props but we no longer rely on them for truth
  pinCode: string | null;
  onPinCodeChange: (pin: string | null) => void;

  onLogout: () => void;
  onNavigate?: (page: PageName) => void;
}

export default function SettingsPage({
  onBack,
  language,
  onLanguageChange,
  pinCode,
  onPinCodeChange,
  onLogout,
  onNavigate,
}: SettingsPageProps) {
  const { session, logout, setIsLocked, setIsPinRequired } = useSession();

  const [showPinOptions, setShowPinOptions] = useState(false);
  const [mode, setMode] = useState<"create" | "change" | "remove">("create");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // ✅ Firestore truth
  const [pinRequiredDb, setPinRequiredDb] = useState<boolean>(false);
  const [pinLoading, setPinLoading] = useState<boolean>(true);
  const [pinBusy, setPinBusy] = useState<boolean>(false);

  // PUSH UI STATE
  const [pushSupported, setPushSupported] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  const translations = {
    en: {
      back: "Back",
      title: "Settings",
      subtitle: "Language, Password, and account options.",
      language: "Language",

      push: "Notifications",
      pushDesc: "Get notified when you receive a new secret letter.",
      pushEnable: "Enable notifications",
      pushEnabled: "Notifications enabled",
      pushNotSupported: "Push notifications are not supported on this device/browser.",
      pushPermissionDenied: "Notifications are blocked in your browser settings.",

      pin: "Password Lock",
      pinDescription: "Protect your inbox with a 6 characters password (letters+numbers).",
      createPin: "Create password",
      changePin: "Change password",
      removePin: "Remove password",
      enterCurrentPin: "Current password",
      enterNewPin: "New password",
      confirmNewPin: "Confirm",
      cancel: "Cancel",
      save: "Save",
      remove: "Remove",
      pinsDontMatch: "Passwords don’t match",
      pinTooShort: "Password must be 6 characters (A-Z, 0-9)",
      pinSaved: "Password updated!",
      pinRemoved: "Password removed",
      wrongPin: "Wrong password",

      account: "Account",
      logout: "Log out",
      logoutDescription: "Disconnect from this inbox on this device.",
      currentInbox: "Current inbox",
      footer: "made by D&F with",
    },
    fr: {
      back: "Retour",
      title: "Réglages",
      subtitle: "Langue, Mot de passe, et options de compte.",
      language: "Langue",

      push: "Notifications",
      pushDesc: "Reçois une alerte quand tu reçois une nouvelle lettre.",
      pushEnable: "Activer les notifications",
      pushEnabled: "Notifications activées",
      pushNotSupported: "Les notifications push ne sont pas supportées sur cet appareil/navigateur.",
      pushPermissionDenied: "Les notifications sont bloquées dans les réglages du navigateur.",

      pin: "Verrou Mot de passe",
      pinDescription: "Protège ta boîte avec un mot de passe de 6 caractères (lettres+chiffres).",
      createPin: "Créer un mot de passe",
      changePin: "Changer le mot de passe",
      removePin: "Supprimer le mot de passe",
      enterCurrentPin: "Mot de passe actuel",
      enterNewPin: "Nouveau mot de passe",
      confirmNewPin: "Confirmer",
      cancel: "Annuler",
      save: "Enregistrer",
      remove: "Supprimer",
      pinsDontMatch: "Les mots de passe ne correspondent pas",
      pinTooShort: "Le mot de passe doit faire 6 caractères (A-Z, 0-9)",
      pinSaved: "Mot de passe mis à jour !",
      pinRemoved: "Mot de passe supprimé",
      wrongPin: "Mot de passe incorrect",

      account: "Compte",
      logout: "Se déconnecter",
      logoutDescription: "Déconnecte cette boîte sur cet appareil.",
      currentInbox: "Boîte actuelle",
      footer: "créé par D&F avec",
    },
  };

  const t = translations[language];

  const validatePin6 = (v: string) => /^[A-Za-z0-9]{6}$/.test(v);

  // ✅ load DB truth: pinRequired
  useEffect(() => {
    let mounted = true;
  
    (async () => {
      try {
        setPinLoading(true);
        if (!session.inboxId || !session.sessionToken) return;
  
        const meta = await getInboxMeta(
          session.inboxId,
          session.sessionToken
        );
  
        if (!mounted) return;
  
        const next = !!meta.pinRequired;
  
        setPinRequiredDb(next);
  
        // ✅ prevent feedback loop
        setIsPinRequired?.((prev: boolean) =>
          prev === next ? prev : next
        );
      } catch {
        // ignore quietly
      } finally {
        if (mounted) setPinLoading(false);
      }
    })();
  
    return () => {
      mounted = false;
    };
  }, [session.inboxId, session.sessionToken]); // ✅ removed setIsPinRequired
  

  // Detect push support + current status on mount
  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setPushSupported(supported);

    const perm = (typeof Notification !== "undefined" ? Notification.permission : "default") as NotificationPermission;
    setPushPermission(perm);

    if (!supported) return;

    (async () => {
      const sub = await getExistingPushSub();
      setPushSubscribed(!!sub);
    })();
  }, []);

  const resetPinForm = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
  };

  const handlePinAction = (action: "create" | "change" | "remove") => {
    setMode(action);
    setShowPinOptions(true);
    resetPinForm();
  };

  const handleCancel = () => {
    setShowPinOptions(false);
    resetPinForm();
  };

  const handleSavePin = async () => {
    if (!session.inboxId || !session.sessionToken) {
      toast.error(language === "fr" ? "Pas connecté" : "Not logged in");
      return;
    }

    // validate
    if (mode !== "remove") {
      if (!validatePin6(newPin)) return toast.error(t.pinTooShort);
      if (newPin !== confirmPin) return toast.error(t.pinsDontMatch);
    }
    if ((mode === "change" || mode === "remove") && !validatePin6(currentPin)) {
      return toast.error(t.wrongPin);
    }

    setPinBusy(true);
    try {
      const res = await updateInboxPin({
        inboxId: session.inboxId,
        sessionToken: session.sessionToken,
        action: mode,
        currentPin: mode === "create" ? undefined : currentPin,
        newPin: mode === "remove" ? undefined : newPin,
      });

      setPinRequiredDb(!res.pinRequired);
      setIsPinRequired?.(!res.pinRequired);

      // optional: keep your parent prop in sync too
      onPinCodeChange(res.pinRequired ? newPin : null);

      toast.success(mode === "remove" ? t.pinRemoved : t.pinSaved);

      // If they removed PIN, inbox should not be "locked"
      if (!res.pinRequired) setIsLocked?.(false);

      setShowPinOptions(false);
      resetPinForm();
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("wrong")) toast.error(t.wrongPin);
      else toast.error(msg || (language === "fr" ? "Erreur" : "Failed"));
    } finally {
      setPinBusy(false);
    }
  };

  const handleLogout = () => {
    logout(); // clears storage + session
    onLogout?.();
    toast.success(language === "fr" ? "Déconnecté" : "Logged out");
  };

  const onEnablePush = async () => {
    if (!pushSupported) return toast.error(t.pushNotSupported);
    if (!session.inboxId || !session.sessionToken) return toast.error(language === "fr" ? "Pas connecté" : "Not logged in");
    if (pushPermission === "denied") return toast.error(t.pushPermissionDenied);

    setPushBusy(true);
    try {
      const sub = await enableNotifications();
      setPushPermission(Notification.permission);

      await savePushSub({
        inboxId: session.inboxId,
        sessionToken: session.sessionToken,
        subscription: sub.toJSON(),
      });

      setPushSubscribed(true);
      toast.success(language === "fr" ? "Notifications activées ✅" : "Notifications enabled ✅");
    } catch (e: any) {
      toast.error(String(e?.message || (language === "fr" ? "Erreur" : "Failed")));
      const sub = await getExistingPushSub();
      setPushSubscribed(!!sub);
      setPushPermission((typeof Notification !== "undefined" ? Notification.permission : "default") as NotificationPermission);
    } finally {
      setPushBusy(false);
    }
  };

  const pushStatus = useMemo(() => {
    if (!pushSupported) return { ok: false, text: t.pushNotSupported };
    if (pushPermission === "denied") return { ok: false, text: t.pushPermissionDenied };
    if (pushSubscribed) return { ok: true, text: t.pushEnabled };
    return { ok: false, text: language === "fr" ? "Désactivées" : "Disabled" };
  }, [pushSupported, pushPermission, pushSubscribed, t, language]);

  const hasPin = pinRequiredDb; // ✅ truth from DB

  return (
    <AppFrame>
      <div className="relative">
        <motion.button
          onClick={onBack}
          className="inline-flex items-center gap-3 text-[24px] italic text-[color:var(--text-light)]
                     font-['Cormorant_Garamond',serif] px-3 py-2 rounded-[14px] bg-white/35 backdrop-blur
                     border border-white/50 shadow-[0_10px_30px_rgba(180,90,130,.10)] hover:bg-white/45
                     active:scale-[0.99] transition"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-[30px] leading-none">←</span>
          <span className="leading-none">{t.back}</span>
        </motion.button>

        <div className="mt-4 text-center">
          <motion.div className="text-6xl" animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}>
            ⚙️
          </motion.div>
          <h1 className="mt-2 font-['Playfair_Display',serif] italic font-bold text-[26px] text-[color:var(--rose-deep)] drop-shadow-[0_2px_12px_rgba(200,90,130,.18)]">
            {t.title}
          </h1>
          <p className="mt-3 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">{t.subtitle}</p>

          <div className="mt-5 mb-4 flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
            <div className="text-[13px] text-[color:var(--rose-deep)]">♥</div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
          </div>
        </div>

        <div className="mt-2 space-y-4">
          {/* Notifications */}
          <div className="rounded-[18px] bg-white/55 border border-white/60 shadow-[0_10px_30px_rgba(180,90,130,.12)] px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">
                  {t.push}
                </div>
                <p className="mt-1 font-['Cormorant_Garamond',serif] italic text-[15px] text-[color:var(--text-light)]">
                  {t.pushDesc}
                </p>
              </div>

              <div
                className={[
                  "shrink-0 rounded-full px-3 py-1 text-[12px] italic border",
                  pushStatus.ok ? "bg-white/60 border-white/70 text-[color:var(--rose-deep)]" : "bg-white/40 border-white/60 text-[color:var(--text-light)]",
                ].join(" ")}
              >
                {pushStatus.text}
              </div>
            </div>

            <motion.button
              type="button"
              onClick={onEnablePush}
              disabled={pushBusy || !pushSupported || pushPermission === "denied"}
              className="mt-4 w-full rounded-[16px] px-5 py-4 text-left
                         shadow-[0_10px_30px_rgba(155,45,90,.18)]
                         bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45]
                         disabled:opacity-60 disabled:cursor-not-allowed
                         active:scale-[0.99]"
              whileHover={!pushBusy ? { y: -1 } : {}}
            >
              <div className="font-['Playfair_Display',serif] italic font-bold text-[16px] text-white">
                {pushSubscribed ? (language === "fr" ? "Réactiver / synchroniser" : "Re-enable / sync") : t.pushEnable}
              </div>
              <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-white/80">
                {language === "fr" ? "Autorise le navigateur et enregistre l’appareil" : "Allow browser + register this device"}
              </div>
            </motion.button>
          </div>

          {/* Language */}
          <div className="rounded-[18px] bg-white/55 border border-white/60 shadow-[0_10px_30px_rgba(180,90,130,.12)] px-5 py-4">
            <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">{t.language}</div>

            <div className="mt-3 flex gap-3">
              <button
                onClick={() => onLanguageChange("en")}
                className={`flex-1 rounded-[14px] px-4 py-3 font-['Cormorant_Garamond',serif] italic text-[16px] shadow
                  ${language === "en" ? "bg-gradient-to-br from-[#e8a0b4] to-[#d4789c] text-white" : "bg-white/60 text-[#5a2d42]"}`}
              >
                English
              </button>
              <button
                onClick={() => onLanguageChange("fr")}
                className={`flex-1 rounded-[14px] px-4 py-3 font-['Cormorant_Garamond',serif] italic text-[16px] shadow
                  ${language === "fr" ? "bg-gradient-to-br from-[#e8a0b4] to-[#d4789c] text-white" : "bg-white/60 text-[#5a2d42]"}`}
              >
                Français
              </button>
            </div>
          </div>

          {/* Password*/}
          <div className="rounded-[18px] bg-white/55 border border-white/60 shadow-[0_10px_30px_rgba(180,90,130,.12)] px-5 py-4">
            <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">{t.pin}</div>
            <p className="mt-1 font-['Cormorant_Garamond',serif] italic text-[15px] text-[color:var(--text-light)]">{t.pinDescription}</p>

            {!showPinOptions && (
              <div className="mt-4 grid grid-cols-1 gap-3">
                {pinLoading ? (
                  <div className="text-[14px] italic text-[color:var(--text-light)]">
                    {language === "fr" ? "Chargement…" : "Loading…"}
                  </div>
                ) : pinRequiredDb ? (
                  <button
                    onClick={() => handlePinAction("create")}
                    className="rounded-[16px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.18)]
                               bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] active:scale-[0.99]"
                  >
                    <div className="font-['Playfair_Display',serif] italic font-bold text-[16px] text-white">{t.createPin}</div>
                    <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-white/80">
                      {language === "fr" ? "Active une protection" : "Enable protection"}
                    </div>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handlePinAction("change")}
                      className="rounded-[16px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(180,90,130,.14)]
                                 bg-white/60 border border-white/70 active:scale-[0.99]"
                    >
                      <div className="font-['Playfair_Display',serif] italic font-bold text-[16px] text-[#5a2d42]">{t.changePin}</div>
                      <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)]">
                        {language === "fr" ? "Mettre à jour" : "Update your password"}
                      </div>
                    </button>

                    <button
                      onClick={() => handlePinAction("remove")}
                      className="rounded-[16px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(180,90,130,.14)]
                                 bg-white/60 border border-white/70 active:scale-[0.99]"
                    >
                      <div className="font-['Playfair_Display',serif] italic font-bold text-[16px] text-[#5a2d42]">{t.removePin}</div>
                      <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)]">
                        {language === "fr" ? "Désactiver la protection" : "Disable protection"}
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}

            <AnimatePresence>
              {showPinOptions && (
                <motion.div className="mt-4 space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                  {mode !== "create" && (
                    <div>
                      <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)] mb-2">{t.enterCurrentPin}</div>
                      <input
                        type="password"
                        maxLength={6}
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value)}
                        className="w-full rounded-[18px] px-5 py-4 bg-white/60 border border-white/70 shadow-[0_10px_30px_rgba(180,90,130,.12)]
                                   font-['Cormorant_Garamond',serif] italic text-[20px] text-[#5a2d42] text-center tracking-widest
                                   outline-none focus:ring-2 focus:ring-[#e8a0b4]"
                        placeholder="6 ••••••••"
                      />
                    </div>
                  )}

                  {mode !== "remove" && (
                    <>
                      <div>
                        <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)] mb-2">{t.enterNewPin}</div>
                        <input
                          type="password"
                          maxLength={6}
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          className="w-full rounded-[18px] px-5 py-4 bg-white/60 border border-white/70 shadow-[0_10px_30px_rgba(180,90,130,.12)]
                                     font-['Cormorant_Garamond',serif] italic text-[20px] text-[#5a2d42] text-center tracking-widest
                                     outline-none focus:ring-2 focus:ring-[#e8a0b4]"
                          placeholder="6 ••••••••"
                        />
                      </div>

                      <div>
                        <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)] mb-2">{t.confirmNewPin}</div>
                        <input
                          type="password"
                          maxLength={6}
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value)}
                          className="w-full rounded-[18px] px-5 py-4 bg-white/60 border border-white/70 shadow-[0_10px_30px_rgba(180,90,130,.12)]
                                     font-['Cormorant_Garamond',serif] italic text-[20px] text-[#5a2d42] text-center tracking-widest
                                     outline-none focus:ring-2 focus:ring-[#e8a0b4]"
                          placeholder="6 ••••••••"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-2">
                    <motion.button
                      onClick={handleCancel}
                      disabled={pinBusy}
                      className="flex-1 rounded-[16px] px-5 py-4 text-left bg-white/60 border border-white/70 shadow active:scale-[0.99] disabled:opacity-60"
                      whileHover={{ y: -1 }}
                    >
                      <div className="font-['Playfair_Display',serif] italic font-bold text-[16px] text-[#5a2d42]">{t.cancel}</div>
                      <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)]">
                        {language === "fr" ? "Annuler" : "Cancel"}
                      </div>
                    </motion.button>

                    <motion.button
                      onClick={handleSavePin}
                      disabled={pinBusy}
                      className="flex-1 rounded-[16px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.22)]
                                 bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] active:scale-[0.99] disabled:opacity-60"
                      whileHover={{ y: -1 }}
                    >
                      <div className="font-['Playfair_Display',serif] italic font-bold text-[16px] text-white">
                        {pinBusy ? (language === "fr" ? "…" : "…") : mode === "remove" ? t.remove : t.save}
                      </div>
                      <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-white/80">
                        {language === "fr" ? "Valider" : "Confirm"}
                      </div>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Account */}
          {session.inboxId && (
            <div className="rounded-[18px] bg-white/55 border border-white/60 shadow-[0_10px_30px_rgba(180,90,130,.12)] px-5 py-4">
              <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">{t.account}</div>
              <p className="mt-1 font-['Cormorant_Garamond',serif] italic text-[15px] text-[color:var(--text-light)]">{t.logoutDescription}</p>

              <div className="mt-4 rounded-[16px] bg-white/55 border border-white/60 px-4 py-3">
                <div className="font-['Cormorant_Garamond',serif] italic text-[13px] text-[color:var(--text-light)]">{t.currentInbox}</div>
                <div className="mt-1 font-mono text-[12px] text-[#6c5060] break-all">{session.inboxId}</div>
              </div>

              <motion.button
                onClick={handleLogout}
                className="mt-4 w-full rounded-[16px] px-5 py-4 text-left shadow bg-white/60 border border-white/70 active:scale-[0.99]"
                whileHover={{ y: -1 }}
              >
                <div className="font-['Playfair_Display',serif] italic font-bold text-[16px] text-[#5a2d42]">🚪 {t.logout}</div>
                <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)]">
                  {language === "fr" ? "Quitter cette session" : "Leave this session"}
                </div>
              </motion.button>
            </div>
          )}
        </div>

        <button
          onClick={() => onNavigate?.("credits")}
          className="mt-7 w-full text-center text-[12px] italic text-[color:var(--text-light)] opacity-80 underline decoration-[color:var(--rose)] decoration-dotted underline-offset-4 hover:opacity-100 transition"
        >
          {t.footer} ♥
        </button>
      </div>
    </AppFrame>
  );
}