import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import HomePage from './components/HomePage';
import LettersPage from './components/LettersPage';
import ComposePage from './components/ComposePage';
import { clearQueryFromHash, openEmailLink, parseTokenFromHash } from './api/netlify';

// The design components are in TSX already. This App.tsx adds:
// - HashRouter routes
// - email-link token handling (#/letters?t=TOKEN)

function TokenBootstrapper() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = parseTokenFromHash();
    if (!token) return;

    (async () => {
      try {
        await openEmailLink(token);
        clearQueryFromHash();
        navigate('/letters', { replace: true });
      } catch (e) {
        console.error(e);
        alert('This link is invalid, expired, or already used.');
        clearQueryFromHash();
      }
    })();
  }, [navigate]);

  return null;
}

export default function App() {
  return (
    <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full max-w-[402px] mx-auto relative overflow-hidden">
      <HashRouter>
        <TokenBootstrapper />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/letters" element={<LettersPage />} />
          <Route path="/letters/:id" element={<LettersPage />} />
          <Route path="/compose" element={<ComposePage />} />
        </Routes>
      </HashRouter>
    </div>
  );
}
