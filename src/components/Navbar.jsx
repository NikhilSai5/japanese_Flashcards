import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { authUser, logout } = useAuth();

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
        </div>
      </div>
    </nav>
  );
}
