import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useVoice } from '../contexts/VoiceContext';

export default function Navbar() {
  const { authUser, logout } = useAuth();
  const { selectedVoice, voices, voicesLoading, selectVoice, speed, changeSpeed, speak } = useVoice();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const settingsRef = useRef(null);

  const handleLogout = async () => {
    await logout();
  };

  const handlePreview = async (e) => {
    e.stopPropagation();
    if (isPreviewing || voices.length === 0) return;
    setIsPreviewing(true);
    try {
      await speak('こんにちは、よろしくお願いします。');
    } catch (err) {
      console.error('Preview failed:', err);
    } finally {
      setIsPreviewing(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <h1>日本語 <span>Flash</span>cards</h1>
        </div>

        <div className="navbar-links">
          <NavLink
            to="/n5"
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
            id="nav-n5"
          >
            <span className="navbar-link-jp">語彙</span>
            <span className="navbar-link-en">N5 <span className="navbar-level-badge">1–25</span></span>
          </NavLink>
          <NavLink
            to="/n4"
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
            id="nav-n4"
          >
            <span className="navbar-link-jp">語彙</span>
            <span className="navbar-link-en">N4 <span className="navbar-level-badge">26–50</span></span>
          </NavLink>
          <NavLink
            to="/kanji"
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
            id="nav-kanji"
          >
            <span className="navbar-link-jp">漢字</span>
            <span className="navbar-link-en">Kanji</span>
          </NavLink>
          <NavLink
            to="/grammar"
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
            id="nav-grammar"
          >
            <span className="navbar-link-jp">文法</span>
            <span className="navbar-link-en">Grammar</span>
          </NavLink>
        </div>

        <div className="navbar-auth">
          {authUser ? (
            <>
              <span className="navbar-user">{authUser?.username || authUser?.email}</span>
              <button onClick={handleLogout} className="navbar-logout-btn" id="nav-logout">
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/login" className="navbar-login-btn" id="nav-login">
              Login
            </NavLink>
          )}

          <div className="navbar-settings" ref={settingsRef}>
            <button
              className="navbar-settings-btn"
              onClick={() => setSettingsOpen(!settingsOpen)}
              aria-label="Settings"
              aria-expanded={settingsOpen}
              id="nav-settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>

            {settingsOpen && (
              <div className="navbar-settings-dropdown">
                <div className="settings-dropdown-header">
                  <span className="settings-label">TTS Voice</span>
                  <button
                    className={`settings-preview-btn${isPreviewing ? ' previewing' : ''}`}
                    onClick={handlePreview}
                    disabled={isPreviewing || voices.length === 0}
                    title="Preview selected voice"
                    aria-label="Preview voice"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                    {isPreviewing ? 'Playing…' : 'Preview'}
                  </button>
                </div>

                <div className="settings-dropdown-options">
                  {voicesLoading ? (
                    <div className="settings-voices-loading">Loading voices…</div>
                  ) : voices.length === 0 ? (
                    <div className="settings-voices-empty">
                      No Japanese voices found.<br />
                      <small>Install a Japanese language pack in your OS settings.</small>
                    </div>
                  ) : (
                    voices.map((voice) => (
                      <button
                        key={voice.id}
                        className={`settings-voice-option ${selectedVoice === voice.id ? 'active' : ''}`}
                        onClick={() => selectVoice(voice.id)}
                        title={voice.label}
                      >
                        <span className="voice-option-gender">
                          {voice.gender === 'female' ? '♀' : voice.gender === 'male' ? '♂' : '◈'}
                        </span>
                        <span className="voice-option-name">{voice.label}</span>
                        {selectedVoice === voice.id && (
                          <svg className="voice-option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </button>
                    ))
                  )}
                </div>

                <div className="settings-dropdown-header" style={{ marginTop: '4px', borderTop: '1px solid var(--cream)' }}>
                  <span className="settings-label">Speed</span>
                  <span style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: 'var(--muted)' }}>{speed.toFixed(1)}x</span>
                </div>
                <div className="settings-dropdown-options" style={{ padding: '8px 12px' }}>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={speed}
                    onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--ink)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--muted)', marginTop: '4px', fontFamily: "'DM Mono', monospace" }}>
                    <span>0.5x</span>
                    <span>1.0x</span>
                    <span>1.5x</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
