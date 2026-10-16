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

function setAuthCookie(user: AuthUser | null) {
  if (typeof document === 'undefined') return;
  if (!user) {
    document.cookie = 'qp_auth_session=; path=/; max-age=0; SameSite=Lax';
  } else {
    const serialized = encodeURIComponent(JSON.stringify(user));
    document.cookie = `qp_auth_session=${serialized}; path=/; max-age=2592000; SameSite=Lax`;
  }
}

export function getAuthCookie(): AuthUser | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)qp_auth_session=([^;]*)/);
  if (!match || !match[1]) return null;
  try {
    const raw = decodeURIComponent(match[1]);
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getAuthCookie());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = authService.onAuthChange(async (currentUser) => {
      // Make sure the profiles row exists before anything can write a workspace
      // that references it. A failure here is not fatal to plotting.
      if (currentUser) {
        try {
          await ensureProfile();
        } catch (caught) {
          console.warn('Could not sync profile to the database:', caught);
        }
        setAuthCookie(currentUser);
        setUser(currentUser);
      } else {
        const cookieUser = getAuthCookie();
        if (cookieUser) {
          setUser(cookieUser);
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    const syncSession = () => {
      const cookieUser = getAuthCookie();
      setUser((prev) => {
        if (!cookieUser && prev) return null;
        if (cookieUser && (!prev || prev.uid !== cookieUser.uid)) return cookieUser;
        return prev;
      });
    };

    window.addEventListener('focus', syncSession);
    window.addEventListener('storage', syncSession);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

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
      login: (email, password) => run(async () => {
        const loggedUser = await authService.login({ email, password });
        setAuthCookie(loggedUser);
        setUser(loggedUser);
      }),
      loginWithGoogle: () => run(async () => {
        const gUser = await authService.loginWithGoogle();
        setAuthCookie(gUser);
        setUser(gUser);
      }),
      register: (email, password, fullName) => run(async () => {
        const newUser = await authService.register({ email, password, fullName });
        setAuthCookie(newUser);
        setUser(newUser);
      }),
      signOut: () => run(async () => {
        setAuthCookie(null);
        setUser(null);
        await authService.logout();
      }),
    }}>
      {children}
    </AuthContext.Provider>
  );
}
