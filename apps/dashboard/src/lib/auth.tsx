/*
 * Auth + data-source mode for the dashboard.
 *
 * Two ways to use FiberMeter's dashboard:
 *  - Live:  authenticate a developer against the real API (JWT persisted to
 *           localStorage); every page reads/writes the Express + Postgres backend.
 *  - Demo:  no backend required — the whole billing engine runs in-browser via the
 *           zustand store, so judges can explore the full flow offline.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { apiFetch, apiKeyStore, tokenStore } from './api';

type Developer = { id: string; email: string; name: string };

type AuthState = {
  token: string | null;
  developer: Developer | null;
  demoMode: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  enterDemoMode: () => void;
  logout: () => void;
};

const DEV_KEY = 'fibermeter_developer';
const DEMO_KEY = 'fibermeter_demo_mode';

const AuthContext = createContext<AuthState | null>(null);

function readDeveloper(): Developer | null {
  try {
    const raw = localStorage.getItem(DEV_KEY);
    return raw ? (JSON.parse(raw) as Developer) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => tokenStore.get());
  const [developer, setDeveloper] = useState<Developer | null>(() => readDeveloper());
  const [demoMode, setDemoMode] = useState<boolean>(
    () => localStorage.getItem(DEMO_KEY) === 'true',
  );

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; developer: Developer }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      token: null,
    });
    tokenStore.set(res.token);
    localStorage.setItem(DEV_KEY, JSON.stringify(res.developer));
    localStorage.removeItem(DEMO_KEY);
    setTokenState(res.token);
    setDeveloper(res.developer);
    setDemoMode(false);
  }, []);

  const enterDemoMode = useCallback(() => {
    localStorage.setItem(DEMO_KEY, 'true');
    setDemoMode(true);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    apiKeyStore.clear();
    localStorage.removeItem(DEV_KEY);
    localStorage.removeItem(DEMO_KEY);
    setTokenState(null);
    setDeveloper(null);
    setDemoMode(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      developer,
      demoMode,
      isAuthenticated: demoMode || !!token,
      login,
      enterDemoMode,
      logout,
    }),
    [token, developer, demoMode, login, enterDemoMode, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
