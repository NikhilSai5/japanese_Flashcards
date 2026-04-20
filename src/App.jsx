import { useAuth } from './hooks/useAuth';
import { AuthPage } from './pages/AuthPage';
import ProtectedApp from './components/ProtectedApp';

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

  return <ProtectedApp />;
}

export default App;
