/**
 * Auth Context Provider and Hook
 *
 * Manages authentication state (session, user, loading) via React Context.
 * Listens to Supabase auth state changes and provides state to the entire app
 * via the useAuth() hook.
 *
 * Usage:
 *   // In root layout:
 *   <AuthProvider>{children}</AuthProvider>
 *
 *   // In any component:
 *   const { session, user, isLoading, isLoggedIn } = useAuth();
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * Shape of the auth context value.
 */
interface AuthContextType {
  /** Current Supabase session (null if not authenticated) */
  session: Session | null;
  /** Current user derived from session (null if not authenticated) */
  user: User | null;
  /** True until initial session check completes */
  isLoading: boolean;
  /** True if a valid session exists */
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  isLoggedIn: false,
});

/**
 * AuthProvider wraps the app and provides auth state via context.
 *
 * On mount:
 * 1. Checks for an existing session via getSession()
 * 2. Subscribes to onAuthStateChange for real-time updates
 * 3. Sets isLoading = false after the initial session check
 *
 * IMPORTANT: Do NOT call any Supabase auth methods inside the
 * onAuthStateChange callback -- this causes deadlocks per Supabase docs.
 * Only set React state in the callback.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    session,
    user: session?.user ?? null,
    isLoading,
    isLoggedIn: !!session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth state from any component within AuthProvider.
 *
 * @returns AuthContextType with session, user, isLoading, and isLoggedIn
 */
export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
