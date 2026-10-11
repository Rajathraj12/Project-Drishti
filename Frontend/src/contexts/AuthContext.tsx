import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  setDevRole: (role: string) => void;
  devRole: string | null;
  isDevBypass: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [devRole, setDevRoleState] = useState<string | null>(localStorage.getItem('dev_role'));

  // Check if bypass is globally set by Vite env (we use boolean to control UI)
  const isDevBypass = import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';

  useEffect(() => {
    // If Dev Bypass is on and there is no token, maybe we still want to fetch user
    // because X-Dev-Role will be sent and backend will mock a user!
    const token = localStorage.getItem('token');
    
    if (token || isDevBypass) {
      authService.getCurrentUser()
        .then(u => setUser(u))
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [devRole, isDevBypass]);

  const login = async (credentials: any) => {
    const res = await authService.login(credentials);
    localStorage.setItem('token', res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    // We don't remove dev_role so bypass persists
    setUser(null);
  };

  const setDevRole = (role: string) => {
    localStorage.setItem('dev_role', role);
    setDevRoleState(role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setDevRole, devRole, isDevBypass }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
