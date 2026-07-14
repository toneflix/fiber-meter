import { createContext, useContext } from 'react';

export type Developer = { id: string; email: string; name: string };

export type AuthState = {
  token: string | null;
  developer: Developer | null;
  demoMode: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  enterDemoMode: () => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
