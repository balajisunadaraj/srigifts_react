import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    const checkSession = async () => {
      try {
        const storedSession = localStorage.getItem('sri_session_id');
        if (storedSession) {
          const storedUser = localStorage.getItem('sri_user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = (userData, sessionId) => {
    setUser(userData);
    localStorage.setItem('sri_user', JSON.stringify(userData));
    if (sessionId) {
      localStorage.setItem('sri_session_id', sessionId);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sri_user');
    localStorage.removeItem('sri_session_id');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
