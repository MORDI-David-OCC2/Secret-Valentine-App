import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner@2.0.3';
import { SessionProvider } from './contexts/SessionContext';
import HomePage from './components/HomePage';
import LettersPage from './components/LettersPage';
import ComposePage from './components/ComposePage';
import SettingsPage from './components/SettingsPage';
import PinEntryScreen from './components/PinEntryScreen';
import CreditsPage from './components/CreditsPage';
import InboxLinkHandler from './components/InboxLinkHandler';
import ClaimInboxPage from './components/ClaimInboxPage';
import FirstPinSetup from './components/FirstPinSetup';

export type Letter = {
  id: string;
  from: string;
  to: string;
  type: 'love' | 'friend' | 'family' | 'crush';
  date: string;
  message?: string;
  isAnonymous: boolean;
};

function AppContent() {
  const [currentPage, setCurrentPage] = useState<'home' | 'letters' | 'compose' | 'settings' | 'pin' | 'credits' | 'claim' | 'inbox-link' | 'first-pin'>('home');
  const [language, setLanguage] = useState<'en' | 'fr'>('en');
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [tempInboxId, setTempInboxId] = useState<string | null>(null);
  const [tempSessionToken, setTempSessionToken] = useState<string | null>(null);
  
  // Détection de token dans l'URL (/#/inbox?t=abc123)
  useEffect(() => {
    const detectToken = () => {
      const hash = window.location.hash;
      if (hash.includes('?t=')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const token = params.get('t');
        if (token) {
          setLinkToken(token);
          setCurrentPage('inbox-link');
          // Nettoyer l'URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    };

    detectToken();
    
    // Écouter les changements de hash
    window.addEventListener('hashchange', detectToken);
    return () => window.removeEventListener('hashchange', detectToken);
  }, []);

  const handleNavigateToLetters = () => {
    if (pinCode && !isPinVerified) {
      setCurrentPage('pin');
    } else {
      setCurrentPage('letters');
    }
  };

  const handlePinSuccess = () => {
    setIsPinVerified(true);
    setCurrentPage('letters');
  };

  const handlePinChange = (newPin: string | null) => {
    setPinCode(newPin);
    if (newPin === null) {
      setIsPinVerified(false);
    }
  };

  const handleFirstPinCreated = (pin: string) => {
    setPinCode(pin);
    setIsPinVerified(true);
    setTempInboxId(null);
    setTempSessionToken(null);
    setCurrentPage('letters');
  };

  const handleLogout = () => {
    setPinCode(null);
    setIsPinVerified(false);
    setTempInboxId(null);
    setTempSessionToken(null);
    setCurrentPage('home');
  };

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  // Gestion du lien inbox
  if (currentPage === 'inbox-link' && linkToken) {
    return (
      <InboxLinkHandler
        token={linkToken}
        onSuccess={(inboxId, needsPin, sessionToken, pinMustBeCreated) => {
          setLinkToken(null);
          if (pinMustBeCreated && sessionToken) {
            // Nouveau flux : créer PIN obligatoire
            setTempInboxId(inboxId);
            setTempSessionToken(sessionToken);
            setCurrentPage('first-pin');
          } else if (needsPin) {
            setCurrentPage('pin');
          } else {
            setCurrentPage('letters');
          }
        }}
        onError={() => {
          setLinkToken(null);
          setCurrentPage('home');
        }}
        language={language}
      />
    );
  }

  return (
    <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full mx-auto relative overflow-hidden">
      <AnimatePresence mode="wait">
        {currentPage === 'home' && (
          <motion.div
            key="home"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <HomePage 
              onNavigate={(page) => {
                if (page === 'letters') {
                  handleNavigateToLetters();
                } else {
                  setCurrentPage(page as any);
                }
              }} 
              language={language}
            />
          </motion.div>
        )}
        {currentPage === 'letters' && (
          <motion.div
            key="letters"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <LettersPage  
              onBack={() => setCurrentPage('home')}
              language={language}
            />
          </motion.div>
        )}
        {currentPage === 'compose' && (
          <motion.div
            key="compose"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <ComposePage 
              onBack={() => setCurrentPage('home')} 
              language={language}
            />
          </motion.div>
        )}
        {currentPage === 'claim' && (
          <motion.div
            key="claim"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <ClaimInboxPage
              onBack={() => setCurrentPage('home')}
              language={language}
            />
          </motion.div>
        )}
        {currentPage === 'settings' && (
          <motion.div
            key="settings"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <SettingsPage
              language={language}
              onLanguageChange={setLanguage}
              pinCode={pinCode}
              onPinCodeChange={handlePinChange}
              onBack={() => setCurrentPage('home')}
              onLogout={handleLogout}
            />
          </motion.div>
        )}
        {currentPage === 'first-pin' && tempInboxId && tempSessionToken && (
          <motion.div
            key="first-pin"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <FirstPinSetup
              inboxId={tempInboxId}
              sessionToken={tempSessionToken}
              onPinCreated={handleFirstPinCreated}
              onBack={() => setCurrentPage('home')}
              language={language}
            />
          </motion.div>
        )}
        {currentPage === 'pin' && (
          <motion.div
            key="pin"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <PinEntryScreen
              correctPin={pinCode!}
              onSuccess={handlePinSuccess}
              onBack={() => setCurrentPage('home')}
              language={language}
            />
          </motion.div>
        )}
        {currentPage === 'credits' && (
          <motion.div
            key="credits"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <CreditsPage
              onBack={() => setCurrentPage('home')}
              language={language}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Toaster 
        position="top-center" 
        richColors 
        toastOptions={{
          style: {
            fontFamily: 'Inter, sans-serif',
          }
        }}
      />
      <AppContent />
    </SessionProvider>
  );
}