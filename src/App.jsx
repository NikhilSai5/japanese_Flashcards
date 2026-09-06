import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import ProtectedApp from './components/ProtectedApp';
import KanjiDashboard from './pages/KanjiDashboard';
import GrammarPage from './pages/GrammarPage';
import { AuthPage } from './pages/AuthPage';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-title">読み込み中…</div>
        <div className="loading-subtitle">Initializing</div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/n5" replace />} />
          <Route path="/n5" element={<ProtectedApp levelFilter="n5" />} />
          <Route path="/n4" element={<ProtectedApp levelFilter="n4" />} />
          <Route path="/kanji" element={<KanjiDashboard />} />
          <Route path="/grammar" element={<GrammarPage />} />
          <Route path="/login" element={<AuthPage />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
