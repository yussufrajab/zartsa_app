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

function storeTokens(access: string, refresh: string) {
  localStorage.setItem('zartsa_token', access);
  localStorage.setItem('zartsa_refresh_token', refresh);
  api.setToken(access);
}

function clearTokens() {
  localStorage.removeItem('zartsa_token');
  localStorage.removeItem('zartsa_refresh_token');
  api.setToken(null);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('zartsa_refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await api.post<{ data: { accessToken: string; refreshToken: string } }>('/auth/refresh', { refreshToken });
    storeTokens(res.data.accessToken, res.data.refreshToken);
    return res.data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
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
        .catch(async () => {
          const newToken = await refreshAccessToken();
          if (newToken) {
            try {
              const res = await api.get<{ data: AuthUser }>('/auth/me');
              setUser(res.data);
            } catch {
              clearTokens();
            }
          } else {
            clearTokens();
          }
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
    storeTokens(res.data.accessToken, res.data.refreshToken);
    const me = await api.get<{ data: AuthUser }>('/auth/me');
    setUser(me.data);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await api.post<{ data: { accessToken: string; refreshToken: string } }>('/auth/register', data);
    storeTokens(res.data.accessToken, res.data.refreshToken);
    const me = await api.get<{ data: AuthUser }>('/auth/me');
    setUser(me.data);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
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