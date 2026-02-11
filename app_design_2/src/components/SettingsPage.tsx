import { useState } from 'react';
import { motion } from 'motion/react';
import svgPaths from "../imports/svg-zn5hjk1775";
import { useSession } from '../contexts/SessionContext';

function MdiHeart({ className }: { className?: string }) {
  return (
    <div className={className || "relative shrink-0 size-[24px]"} data-name="mdi:heart">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="mdi:heart">
          <path d={svgPaths.p18ccc940} fill="#DB8C8F" />
        </g>
      </svg>
    </div>
  );
}

function SettingsIcon() {
  return (
    <div className="size-[42px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 42 42">
        <path d="M21 26.25c2.9 0 5.25-2.35 5.25-5.25S23.9 15.75 21 15.75 15.75 18.1 15.75 21s2.35 5.25 5.25 5.25z" stroke="#DB8C8F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M33.95 26.25c-.175.7-.525 1.4-.875 2.1l1.925 3.325-4.2 4.2-3.325-1.925c-.7.35-1.4.7-2.1.875L24.5 39h-5.95l-.875-4.2c-.7-.175-1.4-.525-2.1-.875l-3.325 1.925-4.2-4.2 1.925-3.325c-.35-.7-.7-1.4-.875-2.1L5 24.5v-5.95l4.2-.875c.175-.7.525-1.4.875-2.1L8.15 12.25l4.2-4.2 3.325 1.925c.7-.35 1.4-.7 2.1-.875L18.55 5h5.95l.875 4.2c.7.175 1.4.525 2.1.875l3.325-1.925 4.2 4.2-1.925 3.325c.35.7.7 1.4.875 2.1l4.2.875v5.95l-4.2.875z" stroke="#DB8C8F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    </div>
  );
}

interface SettingsPageProps {
  onBack: () => void;
  language: 'en' | 'fr';
  onLanguageChange: (lang: 'en' | 'fr') => void;
  pinCode: string | null;
  onPinCodeChange: (pin: string | null) => void;
  onLogout?: () => void;
}

export default function SettingsPage({ onBack, language, onLanguageChange, pinCode, onPinCodeChange, onLogout }: SettingsPageProps) {
  const [showPinInput, setShowPinInput] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [mode, setMode] = useState<'set' | 'change' | 'remove'>('set');
  const { session, logout } = useSession();

  const translations = {
    en: {
      title: 'Settings',
      language: 'Language',
      english: 'English',
      french: 'French',
      security: 'Security',
      pinCode: 'PIN Code',
      pinDescription: 'Protect your inbox with a PIN code',
      setPin: 'Set PIN Code',
      changePin: 'Change PIN Code',
      removePin: 'Remove PIN Code',
      enterCurrentPin: 'Enter current PIN',
      enterNewPin: 'Enter new PIN (4 digits)',
      confirmNewPin: 'Confirm new PIN',
      cancel: 'Cancel',
      save: 'Save',
      remove: 'Remove',
      pinSet: 'PIN code is currently set',
      pinNotSet: 'No PIN code set',
      pinMismatch: 'PINs do not match',
      pinInvalid: 'PIN must be 4 digits',
      wrongPin: 'Wrong PIN code',
      account: 'Account',
      logout: 'Logout',
      logoutDescription: 'Sign out and return to home',
      currentInbox: 'Current inbox:',
      confirmLogout: 'Are you sure you want to logout?',
    },
    fr: {
      title: 'Paramètres',
      language: 'Langue',
      english: 'Anglais',
      french: 'Français',
      security: 'Sécurité',
      pinCode: 'Code PIN',
      pinDescription: 'Protégez votre boîte de réception avec un code PIN',
      setPin: 'Définir un code PIN',
      changePin: 'Modifier le code PIN',
      removePin: 'Supprimer le code PIN',
      enterCurrentPin: 'Entrez le code PIN actuel',
      enterNewPin: 'Entrez le nouveau PIN (4 chiffres)',
      confirmNewPin: 'Confirmez le nouveau PIN',
      cancel: 'Annuler',
      save: 'Enregistrer',
      remove: 'Supprimer',
      pinSet: 'Code PIN actuellement défini',
      pinNotSet: 'Aucun code PIN défini',
      pinMismatch: 'Les codes PIN ne correspondent pas',
      pinInvalid: 'Le PIN doit contenir 4 chiffres',
      wrongPin: 'Code PIN incorrect',
      account: 'Compte',
      logout: 'Déconnexion',
      logoutDescription: 'Se déconnecter et retourner à l\'accueil',
      currentInbox: 'Boîte actuelle :',
      confirmLogout: 'Êtes-vous sûr de vouloir vous déconnecter ?',
    }
  };

  const t = translations[language];

  const handleLogout = () => {
    if (window.confirm(t.confirmLogout)) {
      logout();
      if (onLogout) {
        onLogout();
      }
    }
  };

  const handleSavePin = () => {
    if (mode === 'set' || mode === 'change') {
      if (mode === 'change' && currentPin !== pinCode) {
        alert(t.wrongPin);
        return;
      }
      if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        alert(t.pinInvalid);
        return;
      }
      if (newPin !== confirmPin) {
        alert(t.pinMismatch);
        return;
      }
      onPinCodeChange(newPin);
      setShowPinInput(false);
      setNewPin('');
      setConfirmPin('');
      setCurrentPin('');
    } else if (mode === 'remove') {
      if (currentPin !== pinCode) {
        alert(t.wrongPin);
        return;
      }
      onPinCodeChange(null);
      setShowPinInput(false);
      setCurrentPin('');
    }
  };

  const handleCancel = () => {
    setShowPinInput(false);
    setNewPin('');
    setConfirmPin('');
    setCurrentPin('');
  };

  return (
    <div className="bg-[rgba(246,193,208,0.71)] relative min-h-screen w-full pb-24">
      {/* Back Button */}
      <motion.button
        onClick={onBack}
        className="absolute top-10 left-5 font-['Inter',sans-serif] font-medium text-[25px] text-[#2d1b1b] z-10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ x: -5, scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        ← {t.cancel}
      </motion.button>

      {/* Header */}
      <motion.div 
        className="flex gap-[6px] items-center justify-center pt-[93px] pb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <motion.div
          animate={{ 
            rotate: [0, 360]
          }}
          transition={{ 
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <SettingsIcon />
        </motion.div>
        <h1 className="font-['Kaushan_Script',sans-serif] text-[35px] text-black">{t.title}</h1>
      </motion.div>

      {/* Divider */}
      <motion.div 
        className="w-full h-[1px] bg-black"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />

      {/* Settings Content */}
      <motion.div 
        className="mx-5 mt-8 space-y-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        {/* Language Section */}
        <motion.div
          className="bg-white/80 rounded-[15px] p-6 shadow-lg"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h2 className="font-['Inter',sans-serif] font-bold text-[20px] text-[#a31e46] mb-4">
            {t.language}
          </h2>
          <div className="flex gap-3">
            <motion.button
              onClick={() => onLanguageChange('en')}
              className={`flex-1 rounded-[10px] h-[60px] flex items-center justify-center gap-2 font-['Inter',sans-serif] font-medium text-[16px] transition-all ${
                language === 'en' 
                  ? 'bg-[#a31e46] text-white shadow-lg' 
                  : 'bg-[rgba(219,140,143,0.25)] text-[#2d1b1b] border-2 border-[#db8c8f]'
              }`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-2xl">🇬🇧</span>
              {t.english}
            </motion.button>
            <motion.button
              onClick={() => onLanguageChange('fr')}
              className={`flex-1 rounded-[10px] h-[60px] flex items-center justify-center gap-2 font-['Inter',sans-serif] font-medium text-[16px] transition-all ${
                language === 'fr' 
                  ? 'bg-[#a31e46] text-white shadow-lg' 
                  : 'bg-[rgba(219,140,143,0.25)] text-[#2d1b1b] border-2 border-[#db8c8f]'
              }`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-2xl">🇫🇷</span>
              {t.french}
            </motion.button>
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.div
          className="bg-white/80 rounded-[15px] p-6 shadow-lg"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <h2 className="font-['Inter',sans-serif] font-bold text-[20px] text-[#a31e46] mb-2">
            {t.security}
          </h2>
          <p className="font-['Inter',sans-serif] font-light text-[14px] text-[#4a4a4a] mb-4">
            {t.pinDescription}
          </p>
          
          {!showPinInput ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔒</span>
                <p className="font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b]">
                  {pinCode ? t.pinSet : t.pinNotSet}
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                {!pinCode ? (
                  <motion.button
                    onClick={() => {
                      setMode('set');
                      setShowPinInput(true);
                    }}
                    className="w-full bg-[#a31e46] text-white font-['Inter',sans-serif] font-bold text-[16px] rounded-[10px] h-[50px] shadow-lg"
                    whileHover={{ scale: 1.03, boxShadow: '0 10px 25px rgba(163,30,70,0.4)' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {t.setPin}
                  </motion.button>
                ) : (
                  <>
                    <motion.button
                      onClick={() => {
                        setMode('change');
                        setShowPinInput(true);
                      }}
                      className="w-full bg-[#a31e46] text-white font-['Inter',sans-serif] font-bold text-[16px] rounded-[10px] h-[50px] shadow-lg"
                      whileHover={{ scale: 1.03, boxShadow: '0 10px 25px rgba(163,30,70,0.4)' }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {t.changePin}
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setMode('remove');
                        setShowPinInput(true);
                      }}
                      className="w-full bg-[rgba(219,140,143,0.5)] text-[#2d1b1b] font-['Inter',sans-serif] font-bold text-[16px] rounded-[10px] h-[50px] border-2 border-[#db8c8f]"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {t.removePin}
                    </motion.button>
                  </>
                )}
              </div>
            </>
          ) : (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {(mode === 'change' || mode === 'remove') && (
                <div>
                  <label className="font-['Inter',sans-serif] font-medium text-[14px] text-[#2d1b1b] mb-2 block">
                    {t.enterCurrentPin}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[18px] text-[#2d1b1b] text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#a31e46]"
                    placeholder="••••"
                  />
                </div>
              )}
              
              {mode !== 'remove' && (
                <>
                  <div>
                    <label className="font-['Inter',sans-serif] font-medium text-[14px] text-[#2d1b1b] mb-2 block">
                      {t.enterNewPin}
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[18px] text-[#2d1b1b] text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#a31e46]"
                      placeholder="••••"
                    />
                  </div>
                  <div>
                    <label className="font-['Inter',sans-serif] font-medium text-[14px] text-[#2d1b1b] mb-2 block">
                      {t.confirmNewPin}
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[18px] text-[#2d1b1b] text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#a31e46]"
                      placeholder="••••"
                    />
                  </div>
                </>
              )}
              
              <div className="flex gap-3 pt-2">
                <motion.button
                  onClick={handleCancel}
                  className="flex-1 bg-[rgba(219,140,143,0.5)] text-[#2d1b1b] font-['Inter',sans-serif] font-bold text-[16px] rounded-[10px] h-[50px] border-2 border-[#db8c8f]"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {t.cancel}
                </motion.button>
                <motion.button
                  onClick={handleSavePin}
                  className="flex-1 bg-[#a31e46] text-white font-['Inter',sans-serif] font-bold text-[16px] rounded-[10px] h-[50px] shadow-lg"
                  whileHover={{ scale: 1.03, boxShadow: '0 10px 25px rgba(163,30,70,0.4)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  {mode === 'remove' ? t.remove : t.save}
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Account Section - Logout */}
        {session.inboxId && (
          <motion.div
            className="bg-white/80 rounded-[15px] p-6 shadow-lg"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <h2 className="font-['Inter',sans-serif] font-bold text-[20px] text-[#a31e46] mb-2">
              {t.account}
            </h2>
            <p className="font-['Inter',sans-serif] font-light text-[14px] text-[#4a4a4a] mb-4">
              {t.logoutDescription}
            </p>
            
            <div className="flex items-center gap-2 mb-4 bg-[rgba(163,30,70,0.1)] rounded-[10px] p-3">
              <span className="text-xl">📬</span>
              <div>
                <p className="font-['Inter',sans-serif] font-medium text-[13px] text-[#2d1b1b]">
                  {t.currentInbox}
                </p>
                <p className="font-['Inter',sans-serif] font-mono text-[12px] text-[#666] truncate">
                  {session.inboxId.slice(0, 20)}...
                </p>
              </div>
            </div>
            
            <motion.button
              onClick={handleLogout}
              className="w-full bg-[rgba(219,140,143,0.5)] hover:bg-[rgba(219,140,143,0.7)] text-[#2d1b1b] font-['Inter',sans-serif] font-bold text-[16px] rounded-[10px] h-[50px] border-2 border-[#db8c8f] transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              🚪 {t.logout}
            </motion.button>
          </motion.div>
        )}
      </motion.div>

      {/* Footer */}
      <motion.div 
        className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1 }}
      >
        <p className="font-['Inter',sans-serif] font-thin italic text-[15px] text-[#2d1b1b] text-center">
          made by D&F with
        </p>
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1]
          }}
          transition={{ 
            duration: 1,
            repeat: Infinity,
            repeatDelay: 2
          }}
        >
          <MdiHeart className="size-[24px]" />
        </motion.div>
      </motion.div>
    </div>
  );
}