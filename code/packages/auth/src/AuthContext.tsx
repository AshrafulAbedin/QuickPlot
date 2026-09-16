import { createContext, useEffect, useState, type ReactNode } from 'react';
import * as authService from './authService';
import type { AuthUser } from './authService';
import { ensureProfile } from './supabaseClient';

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => authService.onAuthChange(async (currentUser) => {
    // Make sure the profiles row exists before anything can write a workspace
    // that references it. A failure here is not fatal to plotting.
    if (currentUser) {
      try {
        await ensureProfile();
      } catch (caught) {
        console.warn('Could not sync profile to the database:', caught);
      }
    }
    setUser(currentUser);
    setLoading(false);
  }), []);

  async function run(operation: () => Promise<unknown>) {
    setError(null);
    try {
      await operation();
    } catch (caught) {
      const authError = caught instanceof Error ? caught : new Error('Authentication failed.');
      setError(authError);
      throw authError;
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login: (email, password) => run(() => authService.login({ email, password })),
      loginWithGoogle: () => run(authService.loginWithGoogle),
      register: (email, password, fullName) => run(() => authService.register({ email, password, fullName })),
      signOut: () => run(authService.logout),
    }}>
      {children}
    </AuthContext.Provider>
  );
}
