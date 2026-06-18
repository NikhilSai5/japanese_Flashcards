import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { authUser, logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <h1>日本語 <span>Flash</span>cards</h1>
        </div>

        <div className="navbar-links">
          <NavLink
            to="/"
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
            id="nav-vocabulary"
          >
            <span className="navbar-link-jp">語彙</span>
            <span className="navbar-link-en">Vocabulary</span>
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
        </div>
      </div>
    </nav>
  );
}
