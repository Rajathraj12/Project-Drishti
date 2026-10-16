import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { isRole, landingPath, normalizeRole } from '../permissions/rbac';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<User>;
  logout: () => void;
  setDevRole: (role: string) => Promise<void>;
  devRole: string | null;
  isDevBypass: boolean;
  dataEpoch: number;
  landing: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

function persistDevRole(role: string) {
  if (!isRole(role)) return;
  localStorage.setItem('dev_role', role);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [devRole, setDevRoleState] = useState<string | null>(localStorage.getItem('dev_role'));
  const [dataEpoch, setDataEpoch] = useState(0);

  const isDevBypass = import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token && !isDevBypass) {
      setUser(null);
      return null;
    }
    const u = await authService.getCurrentUser();
    const role = normalizeRole(u.role);
    if (!role) {
      setUser(null);
      return null;
    }
    const normalized = { ...u, role };
    setUser(normalized);
    return normalized;
  }, [isDevBypass]);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (token || isDevBypass) {
      refreshUser()
        .catch(() => {
          if (!cancelled) {
            localStorage.removeItem('token');
            if (!isDevBypass) setUser(null);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => { cancelled = true };
  }, [devRole, isDevBypass, refreshUser]);

  const login = async (credentials: any) => {
    const res = await authService.login(credentials);
    localStorage.setItem('token', res.token);
    const role = normalizeRole(res.user.role);
    const normalized = { ...res.user, role: role || res.user.role };
    setUser(normalized);
    setDataEpoch((value) => value + 1);
    return normalized;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setDataEpoch((value) => value + 1);
    if (isDevBypass && devRole) {
      setLoading(true);
      refreshUser().finally(() => setLoading(false));
    }
  };

  const setDevRole = async (role: string) => {
    if (!isDevBypass || !isRole(role)) return;
    persistDevRole(role);
    setDevRoleState(role);
    setLoading(true);
    try {
      await refreshUser();
      setDataEpoch((value) => value + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      setDevRole,
      devRole,
      isDevBypass,
      dataEpoch,
      landing: landingPath(user?.role),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
