// src/App.tsx
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster } from "sonner@2.0.3";
import { SessionProvider } from "./contexts/SessionContext";

import HomePage from "./components/HomePage";
import LettersPage from "./components/LettersPage";
import ComposePage from "./components/ComposePage";
import SettingsPage from "./components/SettingsPage";
import PinEntryScreen from "./components/PinEntryScreen";
import CreditsPage from "./components/CreditsPage";
import InboxLinkHandler from "./components/InboxLinkHandler";
import ClaimInboxPage from "./components/ClaimInboxPage";
import FirstPinSetup from "./components/FirstPinSetup";

import Petals from "./components/ui/Petals";

type Page =
  | "home"
  | "letters"
  | "compose"
  | "settings"
  | "pin"
  | "credits"
  | "claim"
  | "inbox-link"
  | "first-pin";

type NavDir = "forward" | "back";

const PAGE_DEPTH: Record<Page, number> = {
  home: 0,
  letters: 1,
  compose: 1,
  claim: 1,
  settings: 1,
  credits: 1,
  pin: 2,
  "first-pin": 2,
  "inbox-link": 3,
};

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [language, setLanguage] = useState<"en" | "fr">("en");

  const [pinCode, setPinCode] = useState<string | null>(null);
  const [isPinVerified, setIsPinVerified] = useState(false);

  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [pendingLinkToken, setPendingLinkToken] = useState<string | null>(null);

  const [claimMode, setClaimMode] = useState<"login" | "create">("login");

  const [tempInboxId, setTempInboxId] = useState<string | null>(null);
  const [tempSessionToken, setTempSessionToken] = useState<string | null>(null);
  const [tempNeedsEmailAssociation, setTempNeedsEmailAssociation] = useState(false);

  const [navDir, setNavDir] = useState<NavDir>("forward");
  const prevDepthRef = useMemo(() => ({ depth: PAGE_DEPTH[currentPage] }), []);

  const setPage = (next: Page) => {
    const prevDepth = prevDepthRef.depth;
    const nextDepth = PAGE_DEPTH[next] ?? 0;
    setNavDir(nextDepth < prevDepth ? "back" : "forward");
    prevDepthRef.depth = nextDepth;
    setCurrentPage(next);
  };

  // Disable zoom (iOS)
  useEffect(() => {
    const preventGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", preventGesture as any, { passive: false } as any);
    document.addEventListener("gesturechange", preventGesture as any, { passive: false } as any);
    document.addEventListener("gestureend", preventGesture as any, { passive: false } as any);

    let lastTouchEnd = 0;
    const onTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    };
    document.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGesture as any);
      document.removeEventListener("gesturechange", preventGesture as any);
      document.removeEventListener("gestureend", preventGesture as any);
      document.removeEventListener("touchend", onTouchEnd as any);
    };
  }, []);

  // Disable scroll only on Home
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyTouchAction = (document.body.style as any).touchAction;

    if (currentPage === "home") {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      (document.body.style as any).touchAction = "none";
    } else {
      document.documentElement.style.overflow = prevHtmlOverflow || "";
      document.body.style.overflow = prevBodyOverflow || "";
      (document.body.style as any).touchAction = prevBodyTouchAction || "";
    }

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow || "";
      document.body.style.overflow = prevBodyOverflow || "";
      (document.body.style as any).touchAction = prevBodyTouchAction || "";
    };
  }, [currentPage]);

  // detect token /#/inbox?t=...
  useEffect(() => {
    const detectToken = () => {
      const hash = window.location.hash;
      if (hash.includes("?t=")) {
        const params = new URLSearchParams(hash.split("?")[1]);
        const token = params.get("t");
        if (token) {
          setLinkToken(token);
          setPendingLinkToken(null);
          setPage("inbox-link");
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
    };

    detectToken();
    window.addEventListener("hashchange", detectToken);
    return () => window.removeEventListener("hashchange", detectToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNavigateToLetters = () => {
    if (pinCode && !isPinVerified) setPage("pin");
    else setPage("letters");
  };

  const handlePinSuccess = () => {
    setIsPinVerified(true);
    setPage("letters");
  };

  const handlePinChange = (newPin: string | null) => {
    setPinCode(newPin);
    if (newPin === null) setIsPinVerified(false);
  };

  const handleFirstPinCreated = (pin: string) => {
    setPinCode(pin);
    setIsPinVerified(true);

    setTempInboxId(null);
    setTempSessionToken(null);
    setTempNeedsEmailAssociation(false);

    setPage("letters");
  };

  const handleLogout = () => {
    setPinCode(null);
    setIsPinVerified(false);

    setTempInboxId(null);
    setTempSessionToken(null);
    setTempNeedsEmailAssociation(false);

    setPendingLinkToken(null);
    setLinkToken(null);

    setPage("home");
  };

  const pageVariants = {
    initial: (direction: NavDir) => ({
      opacity: 0,
      x: direction === "forward" ? 80 : -80,
    }),
    animate: { opacity: 1, x: 0 },
    exit: (direction: NavDir) => ({
      opacity: 0,
      x: direction === "forward" ? -80 : 80,
    }),
  };

  // Inbox link special flow
  if (currentPage === "inbox-link" && linkToken) {
    return (
      <InboxLinkHandler
        token={linkToken}
        onSuccess={(inboxId, needsPin, sessionToken, pinMustBeCreated, needsEmailAssociation) => {
          setLinkToken(null);

          if (pinMustBeCreated && sessionToken) {
            setTempInboxId(inboxId);
            setTempSessionToken(sessionToken);
            setTempNeedsEmailAssociation(!!needsEmailAssociation);
            setPage("first-pin");
          } else if (needsPin) {
            setPage("pin");
          } else {
            setPage("letters");
          }
        }}
        onError={() => {
          setLinkToken(null);
          setPendingLinkToken(null);
          setPage("home");
        }}
        onGoToLogin={() => {
          setClaimMode("login");
          setPendingLinkToken(linkToken);
          setLinkToken(null);
          setPage("claim");
        }}
        onGoToCreate={() => {
          setClaimMode("create");
          setPendingLinkToken(linkToken);
          setLinkToken(null);
          setPage("claim");
        }}
        language={language}
      />
    );
  }

  return (
    <div className="app">
      <Petals />

      <AnimatePresence mode="wait" custom={navDir}>
        {currentPage === "home" && (
          <motion.div
            key="home"
            variants={pageVariants}
            custom={navDir}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.77, 0, 0.18, 1] }}
            style={{ height: "100%" }}
          >
            <HomePage
              onNavigate={(page) => {
                if (page === "letters") handleNavigateToLetters();
                else setPage(page as Page);
              }}
              language={language}
            />
          </motion.div>
        )}

        {currentPage === "letters" && (
          <motion.div
            key="letters"
            variants={pageVariants}
            custom={navDir}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.77, 0, 0.18, 1] }}
            style={{ height: "100%" }}
          >
            <LettersPage onBack={() => setPage("home")} language={language} onNavigate={(page) => setPage(page as Page)} />
          </motion.div>
        )}

        {currentPage === "compose" && (
          <motion.div
            key="compose"
            variants={pageVariants}
            custom={navDir}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.77, 0, 0.18, 1] }}
            style={{ height: "100%" }}
          >
            <ComposePage onBack={() => setPage("home")} language={language} onNavigate={(page) => setPage(page as Page)} />
          </motion.div>
        )}

        {currentPage === "claim" && (
          <motion.div
            key="claim"
            variants={pageVariants}
            custom={navDir}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.77, 0, 0.18, 1] }}
            style={{ height: "100%" }}
          >
            <ClaimInboxPage
              mode={claimMode}
              pendingImportToken={pendingLinkToken}
              onConsumedPendingImportToken={() => setPendingLinkToken(null)}
              onBack={() => {
                if (pendingLinkToken) {
                  // user cancels claim, go back to hub
                  setLinkToken(pendingLinkToken);
                  setPage("inbox-link");
                } else {
                  setPage("home");
                }
              }}
              language={language}
              onNavigate={(page) => setPage(page as Page)}
            />
          </motion.div>
        )}

        {currentPage === "settings" && (
          <motion.div
            key="settings"
            variants={pageVariants}
            custom={navDir}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.77, 0, 0.18, 1] }}
            style={{ height: "100%" }}
          >
            <SettingsPage
              language={language}
              onLanguageChange={setLanguage}
              pinCode={pinCode}
              onPinCodeChange={handlePinChange}
              onBack={() => setPage("home")}
              onLogout={handleLogout}
              onNavigate={(page) => setPage(page as Page)}
            />
          </motion.div>
        )}

        {currentPage === "first-pin" && tempInboxId && tempSessionToken && (
          <motion.div
            key="first-pin"
            variants={pageVariants}
            custom={navDir}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.77, 0, 0.18, 1] }}
            style={{ height: "100%" }}
          >
            <FirstPinSetup
              inboxId={tempInboxId}
              sessionToken={tempSessionToken}
              needsEmailAssociation={tempNeedsEmailAssociation}
              onPinCreated={handleFirstPinCreated}
              onBack={() => setPage("home")}
              language={language}
            />
          </motion.div>
        )}

        {currentPage === "pin" && (
          <motion.div
            key="pin"
            variants={pageVariants}
            custom={navDir}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.77, 0, 0.18, 1] }}
            style={{ height: "100%" }}
          >
            <PinEntryScreen onSuccess={handlePinSuccess} onBack={() => setPage("home")} language={language} />
          </motion.div>
        )}

        {currentPage === "credits" && (
          <motion.div
            key="credits"
            variants={pageVariants}
            custom={navDir}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.77, 0, 0.18, 1] }}
            style={{ height: "100%" }}
          >
            <CreditsPage onBack={() => setPage("home")} language={language} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Toaster position="top-center" richColors toastOptions={{ style: { fontFamily: "Inter, sans-serif" } }} />
      <AppContent />
    </SessionProvider>
  );
}