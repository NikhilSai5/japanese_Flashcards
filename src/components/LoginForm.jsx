import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function LoginForm({ onSwitchToSignup, onAuthSuccess }) {
  const { login, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
    } else {
      // Call the success callback
      if (onAuthSuccess) {
        setTimeout(onAuthSuccess, 500);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Login</h2>

      {error && <div className="auth-error">{error}</div>}
      {authError && <div className="auth-error">{authError}</div>}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <button type="submit" disabled={loading} className="auth-button">
        {loading ? 'Logging in...' : 'Login'}
      </button>

      <p className="auth-toggle">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="auth-link"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}
