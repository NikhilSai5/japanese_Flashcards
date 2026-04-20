import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function SignupForm({ onSwitchToLogin }) {
  const { signup, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(''); // 'creating' | 'setting-up'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStep('');

    if (!email || !username || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setStep('creating');

    const result = await signup(email, password, username);

    if (!result.success) {
      setLoading(false);
      setStep('');
      setError(result.error);

      // More helpful error messages
      if (result.error.includes('already registered')) {
        setError('This email is already registered. Try logging in instead.');
      } else if (result.error.includes('Invalid email')) {
        setError('Please enter a valid email address.');
      }
    } else {
      setStep('setting-up');
      // Wait for profile to be created by trigger
      setTimeout(() => {
        setLoading(false);
        setStep('');
        // Clear form on success
        setEmail('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
      }, 1500);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Sign Up</h2>

      {error && <div className="auth-error">{error}</div>}
      {authError && <div className="auth-error">{authError}</div>}

      {step === 'creating' && (
        <div className="auth-info">
          ⏳ Creating your account...
        </div>
      )}
      {step === 'setting-up' && (
        <div className="auth-info">
          ✓ Account created! Signing you in...
        </div>
      )}

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
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your display name"
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

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <button type="submit" disabled={loading} className="auth-button">
        {loading ? `${step === 'creating' ? 'Creating...' : 'Setting up...'}` : 'Sign Up'}
      </button>

      <p className="auth-toggle">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="auth-link"
        >
          Login
        </button>
      </p>
    </form>
  );
}
