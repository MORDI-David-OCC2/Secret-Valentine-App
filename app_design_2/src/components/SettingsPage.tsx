import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";
import { useSession } from "../contexts/SessionContext";
import AppFrame from "./ui/AppFrame";
import { savePushSub } from "../services/api";
import { urlBase64ToUint8Array } from "../push/push";

type PageName = "home" | "letters" | "compose" | "settings" | "credits" | "claim";

async function enableNotifications() {
  if (!("serviceWorker" in navigator)) throw new Error("No service worker");
  if (!("PushManager" in window)) throw new Error("No PushManager");

  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permission not granted");

  const reg = await navigator.serviceWorker.ready;

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY as string;
  if (!vapidPublicKey) throw new Error("Missing VITE_VAPID_PUBLIC_KEY1");

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
  const { session } = useSession();

  const [showPinOptions, setShowPinOptions] = useState(false);
  const [mode, setMode] = useState<"create" | "change" | "remove">("create");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // PUSH UI STATE
  const [pushSupported, setPushSupported] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  const translations = {
    en: {
      back: "Back",
      title: "Settings",
      subtitle: "Language, PIN, and account options.",
      language: "Language",

      push: "Notifications",
      pushDesc: "Get notified when you receive a new secret letter.",
      pushEnable: "Enable notifications",
      pushEnabled: "Notifications enabled",
      pushNotSupported: "Push notifications are not supported on this device/browser.",
      pushPermissionDenied: "Notifications are blocked in your browser settings.",

      pin: "PIN Lock",
      pinDescription: "Protect your inbox with a 4-digit PIN.",
      createPin: "Create PIN",
      changePin: "Change PIN",
      removePin: "Remove PIN",
      enterCurrentPin: "Current PIN",
      enterNewPin: "New PIN",
      confirmNewPin: "Confirm",
      cancel: "Cancel",
      save: "Save",
      remove: "Remove",
      pinsDontMatch: "PINs don’t match",
      pinTooShort: "PIN must be 4 digits",
      pinSaved: "PIN updated!",
      pinRemoved: "PIN removed",

      account: "Account",
      logout: "Log out",
      logoutDescription: "Disconnect from this inbox on this device.",
      currentInbox: "Current inbox",
      footer: "made by D&F with",
    },
    fr: {
      back: "Retour",
      title: "Réglages",
      subtitle: "Langue, PIN, et options de compte.",
      language: "Langue",

      push: "Notifications",
      pushDesc: "Reçois une alerte quand tu reçois une nouvelle lettre.",
      pushEnable: "Activer les notifications",
      pushEnabled: "Notifications activées",
      pushNotSupported: "Les notifications push ne sont pas supportées sur cet appareil/navigateur.",
      pushPermissionDenied: "Les notifications sont bloquées dans les réglages du navigateur.",

      pin: "Verrou PIN",
      pinDescription: "Protège ta boîte avec un PIN à 4 chiffres.",
      createPin: "Créer un PIN",
      changePin: "Changer le PIN",
      removePin: "Supprimer le PIN",
      enterCurrentPin: "PIN actuel",
      enterNewPin: "Nouveau PIN",
      confirmNewPin: "Confirmer",
      cancel: "Annuler",
      save: "Enregistrer",
      remove: "Supprimer",
      pinsDontMatch: "Les PIN ne correspondent pas",
      pinTooShort: "Le PIN doit faire 4 chiffres",
      pinSaved: "PIN mis à jour !",
      pinRemoved: "PIN supprimé",

      account: "Compte",
      logout: "Se déconnecter",
      logoutDescription: "Déconnecte cette boîte sur cet appareil.",
      currentInbox: "Boîte actuelle",
      footer: "créé par D&F avec",
    },
  };

  const t = translations[language];

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

  const handleSavePin = () => {
    if (mode !== "remove") {
      if (newPin.length !== 4) return toast.error(t.pinTooShort);
      if (newPin !== confirmPin) return toast.error(t.pinsDontMatch);
    }

    if (mode === "create") {
      onPinCodeChange(newPin);
      toast.success(t.pinSaved);
    }

    if (mode === "change") {
      if (!pinCode) return toast.error("No PIN set");
      if (currentPin !== pinCode) return toast.error(language === "fr" ? "PIN actuel incorrect" : "Wrong current PIN");
      onPinCodeChange(newPin);
      toast.success(t.pinSaved);
    }

    if (mode === "remove") {
      if (!pinCode) return toast.error("No PIN set");
      if (currentPin !== pinCode) return toast.error(language === "fr" ? "PIN actuel incorrect" : "Wrong current PIN");
      onPinCodeChange(null);
      toast.success(t.pinRemoved);
    }

    setShowPinOptions(false);
    resetPinForm();
  };

  const handleLogout = () => {
    onLogout();
    toast.success(language === "fr" ? "Déconnecté" : "Logged out");
  };

  const onEnablePush = async () => {
    if (!pushSupported) {
      toast.error(t.pushNotSupported);
      return;
    }

    // need a logged inbox to attach the subscription to
    if (!session.inboxId || !session.sessionToken) {
      toast.error(language === "fr" ? "Pas connecté" : "Not logged in");
      return;
    }

    // browser-level block
    if (pushPermission === "denied") {
      toast.error(t.pushPermissionDenied);
      return;
    }

    setPushBusy(true);
    try {
      const sub = await enableNotifications();
      setPushPermission(Notification.permission);

      // Save in backend (send JSON)
      await savePushSub({
        inboxId: session.inboxId,
        sessionToken: session.sessionToken,
        subscription: sub.toJSON(),
      });

      setPushSubscribed(true);
      toast.success(language === "fr" ? "Notifications activées ✅" : "Notifications enabled ✅");
    } catch (e: any) {
      const msg = String(e?.message || "");
      toast.error(msg || (language === "fr" ? "Erreur" : "Failed"));
      // refresh local status
      const sub = await getExistingPushSub();
      setPushSubscribed(!!sub);
      setPushPermission((typeof Notification !== "undefined" ? Notification.permission : "default") as NotificationPermission);
    } finally {
      setPushBusy(false);
    }
  };

  // small status label
  const pushStatus = useMemo(() => {
    if (!pushSupported) return { ok: false, text: t.pushNotSupported };
    if (pushPermission === "denied") return { ok: false, text: t.pushPermissionDenied };
    if (pushSubscribed) return { ok: true, text: t.pushEnabled };
    return { ok: false, text: language === "fr" ? "Désactivées" : "Disabled" };
  }, [pushSupported, pushPermission, pushSubscribed, t, language]);

  return (
    <AppFrame>
      <div className="relative">
        {/* Back */}
        <motion.button
          onClick={onBack}
          className="
            inline-flex items-center gap-3
            text-[24px] italic
            text-[color:var(--text-light)]
            font-['Cormorant_Garamond',serif]
            px-3 py-2
            rounded-[14px]
            bg-white/35 backdrop-blur
            border border-white/50
            shadow-[0_10px_30px_rgba(180,90,130,.10)]
            hover:bg-white/45
            active:scale-[0.99]
            transition
          "
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-[30px] leading-none">←</span>
          <span className="leading-none">{t.back}</span>
        </motion.button>

        {/* Header */}
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
              className="
                mt-4 w-full rounded-[16px] px-5 py-4 text-left
                shadow-[0_10px_30px_rgba(155,45,90,.18)]
                bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45]
                disabled:opacity-60 disabled:cursor-not-allowed
                active:scale-[0.99]
              "
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

          {/* PIN */}
          <div className="rounded-[18px] bg-white/55 border border-white/60 shadow-[0_10px_30px_rgba(180,90,130,.12)] px-5 py-4">
            <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">{t.pin}</div>
            <p className="mt-1 font-['Cormorant_Garamond',serif] italic text-[15px] text-[color:var(--text-light)]">{t.pinDescription}</p>

            {!showPinOptions && (
              <div className="mt-4 grid grid-cols-1 gap-3">
                {!pinCode ? (
                  <button
                    onClick={() => handlePinAction("create")}
                    className="rounded-[16px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.18)] bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] active:scale-[0.99]"
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
                      className="rounded-[16px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(180,90,130,.14)] bg-white/60 border border-white/70 active:scale-[0.99]"
                    >
                      <div className="font-['Playfair_Display',serif] italic font-bold text-[16px] text-[#5a2d42]">{t.changePin}</div>
                      <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)]">
                        {language === "fr" ? "Mettre à jour" : "Update your PIN"}
                      </div>
                    </button>

                    <button
                      onClick={() => handlePinAction("remove")}
                      className="rounded-[16px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(180,90,130,.14)] bg-white/60 border border-white/70 active:scale-[0.99]"
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
                        inputMode="numeric"
                        maxLength={4}
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                        className="w-full rounded-[18px] px-5 py-4 bg-white/60 border border-white/70 shadow-[0_10px_30px_rgba(180,90,130,.12)]
                                   font-['Cormorant_Garamond',serif] italic text-[20px] text-[#5a2d42] text-center tracking-widest
                                   outline-none focus:ring-2 focus:ring-[#e8a0b4]"
                        placeholder="••••"
                      />
                    </div>
                  )}

                  {mode !== "remove" && (
                    <>
                      <div>
                        <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)] mb-2">{t.enterNewPin}</div>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                          className="w-full rounded-[18px] px-5 py-4 bg-white/60 border border-white/70 shadow-[0_10px_30px_rgba(180,90,130,.12)]
                                     font-['Cormorant_Garamond',serif] italic text-[20px] text-[#5a2d42] text-center tracking-widest
                                     outline-none focus:ring-2 focus:ring-[#e8a0b4]"
                          placeholder="••••"
                        />
                      </div>

                      <div>
                        <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)] mb-2">{t.confirmNewPin}</div>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                          className="w-full rounded-[18px] px-5 py-4 bg-white/60 border border-white/70 shadow-[0_10px_30px_rgba(180,90,130,.12)]
                                     font-['Cormorant_Garamond',serif] italic text-[20px] text-[#5a2d42] text-center tracking-widest
                                     outline-none focus:ring-2 focus:ring-[#e8a0b4]"
                          placeholder="••••"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-2">
                    <motion.button
                      onClick={handleCancel}
                      className="flex-1 rounded-[16px] px-5 py-4 text-left bg-white/60 border border-white/70 shadow active:scale-[0.99]"
                      whileHover={{ y: -1 }}
                    >
                      <div className="font-['Playfair_Display',serif] italic font-bold text-[16px] text-[#5a2d42]">{t.cancel}</div>
                      <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)]">
                        {language === "fr" ? "Annuler" : "Cancel"}
                      </div>
                    </motion.button>

                    <motion.button
                      onClick={handleSavePin}
                      className="flex-1 rounded-[16px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.22)] bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] active:scale-[0.99]"
                      whileHover={{ y: -1 }}
                    >
                      <div className="font-['Playfair_Display',serif] italic font-bold text-[16px] text-white">{mode === "remove" ? t.remove : t.save}</div>
                      <div className="font-['Cormorant_Garamond',serif] italic text-[14px] text-white/80">{language === "fr" ? "Valider" : "Confirm"}</div>
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

        {/* Footer */}
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