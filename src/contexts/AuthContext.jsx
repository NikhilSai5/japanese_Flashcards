import { createContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import bcryptjs from 'bcryptjs';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('authUser');
    if (savedUser) {
      try {
        setAuthUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Failed to parse saved user:', err);
      }
    }
    setLoading(false);
  }, []);

  const signup = async (email, password, username) => {
    setError(null);
    try {
      // Hash password
      const hashedPassword = await bcryptjs.hash(password, 10);

      // Insert into custom users table
      const { data, error: insertError } = await supabase
        .from('users')
        .insert({
          email,
          username,
          password: hashedPassword,
          full_name: username,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Set user as logged in and save to localStorage
      setAuthUser(data);
      localStorage.setItem('authUser', JSON.stringify(data));

      return { success: true, user: data };
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
      // Query custom users table
      const { data, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (queryError || !data) throw new Error('User not found');

      // Verify password
      const passwordMatch = await bcryptjs.compare(password, data.password);
      if (!passwordMatch) throw new Error('Invalid password');

      // Set user as logged in and save to localStorage
      setAuthUser(data);
      localStorage.setItem('authUser', JSON.stringify(data));

      return { success: true, user: data };
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
      setAuthUser(null);
      localStorage.removeItem('authUser');
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
