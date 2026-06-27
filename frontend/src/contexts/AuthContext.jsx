import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getToken, getUser, isLoggedIn, setSession, clearSession } from '../core/backend';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(() => getUser());
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn());

  const login = useCallback((token, userData) => {
    setSession(token, userData);
    setUser(userData);
    setLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setLoggedIn(false);
  }, []);

  // Sync logout triggered by 401 responses in backend.js
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('cinemii:logout', handler);
    return () => window.removeEventListener('cinemii:logout', handler);
  }, [logout]);

  // Refresh the cached user on mount so newly-added fields (e.g. is_admin)
  // appear for sessions that logged in before the field existed.
  useEffect(() => {
    if (!getToken()) return;
    api.me()
      .then((fresh) => {
        setUser(fresh);
        setSession(getToken(), fresh);
      })
      .catch(() => { /* 401 handler already clears the session */ });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
