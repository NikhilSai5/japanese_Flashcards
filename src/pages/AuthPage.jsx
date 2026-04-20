import { useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { SignupForm } from '../components/SignupForm';

export function AuthPage() {
  const [mode, setMode] = useState('login');

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>日本語 <span>Flash</span>cards</h1>
          <p>Study Japanese more effectively</p>
        </div>

        {mode === 'login' ? (
          <LoginForm onSwitchToSignup={() => setMode('signup')} />
        ) : (
          <SignupForm onSwitchToLogin={() => setMode('login')} />
        )}
      </div>
    </div>
  );
}
