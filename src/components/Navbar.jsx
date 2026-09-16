import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getAvailableVoices, getStoredVoice, storeVoice } from '../utils/edgeTts';

export default function Navbar() {
  const { authUser, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(() => getStoredVoice());
  const settingsRef = useRef(null);

  const handleLogout = async () => {
    await logout();
  };

  const handleVoiceChange = (voice) => {
    setSelectedVoice(voice);
    storeVoice(voice);
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
                </div>
                <div className="settings-dropdown-options">
                  {getAvailableVoices().map((voice) => (
                    <button
                      key={voice.id}
                      className={`settings-voice-option ${selectedVoice === voice.id ? 'active' : ''}`}
                      onClick={() => handleVoiceChange(voice.id)}
                    >
                      <span className="voice-option-name">{voice.label}</span>
                      {selectedVoice === voice.id && (
                        <svg className="voice-option-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
