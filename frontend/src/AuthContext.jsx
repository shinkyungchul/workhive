import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('wh_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('wh_token'));

  function login(userData, tokenStr) {
    setUser(userData);
    setToken(tokenStr);
    localStorage.setItem('wh_user', JSON.stringify(userData));
    localStorage.setItem('wh_token', tokenStr);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('wh_user');
    localStorage.removeItem('wh_token');
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
