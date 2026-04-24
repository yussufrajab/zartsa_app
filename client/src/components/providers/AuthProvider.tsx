'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import type { AuthUser } from '@zartsa/shared';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, otp: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  requestOtp: (phone: string) => Promise<void>;
}

interface RegisterData {
  phone: string;
  otp: string;
  firstName: string;
  lastName: string;
  email?: string;
  preferredLanguage: 'sw' | 'en';
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('zartsa_token');
    if (token) {
      api.setToken(token);
      api.get<{ data: AuthUser }>('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          api.setToken(null);
          localStorage.removeItem('zartsa_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    await api.post('/auth/otp', { phone });
  }, []);

  const login = useCallback(async (phone: string, otp: string) => {
    const res = await api.post<{ data: { accessToken: string; refreshToken: string } }>('/auth/login', { phone, otp });
    api.setToken(res.data.accessToken);
    const me = await api.get<{ data: AuthUser }>('/auth/me');
    setUser(me.data);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await api.post<{ data: { accessToken: string; refreshToken: string } }>('/auth/register', data);
    api.setToken(res.data.accessToken);
    const me = await api.get<{ data: AuthUser }>('/auth/me');
    setUser(me.data);
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      requestOtp,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}