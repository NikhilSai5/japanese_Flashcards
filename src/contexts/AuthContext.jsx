import { createContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
      } else {
        setAuthUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signup = async (email, password, username) => {
    setError(null);
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: username,
          },
        },
      });

      if (signupError) throw signupError;

      // Wait a moment for the profile trigger to execute
      await new Promise(resolve => setTimeout(resolve, 500));

      return { success: true, user: data.user };
    } catch (err) {
      const errorMessage = err.message || 'Signup failed. Please try again.';
      console.error('Signup error:', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;
      setAuthUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      const errorMessage = err.message || 'Login failed. Please try again.';
      console.error('Login error:', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    setError(null);
    try {
      const { error: logoutError } = await supabase.auth.signOut();
      if (logoutError) throw logoutError;
      setAuthUser(null);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Logout failed';
      console.error('Logout error:', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    authUser,
    loading,
    error,
    signup,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
