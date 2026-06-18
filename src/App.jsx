import { Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import ProtectedApp from './components/ProtectedApp';
import KanjiDashboard from './pages/KanjiDashboard';
import GrammarPage from './pages/GrammarPage';

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
          <Route path="/" element={<ProtectedApp />} />
          <Route path="/kanji" element={<KanjiDashboard />} />
          <Route path="/grammar" element={<GrammarPage />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
