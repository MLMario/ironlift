/**
 * Authentication Service Module
 *
 * TypeScript implementation of the AuthService interface.
 * Provides user registration, login, logout, and session management.
 *
 * Ported from web app (exercise_tracker_app/packages/shared/src/services/auth.ts)
 * with two changes:
 * 1. Import paths updated for iOS project structure
 * 2. resetPassword() and register() use hardcoded scheme URLs for deep linking
 */

import type { User, Session } from '@supabase/supabase-js';

import type {
  AuthService,
  AuthResult,
  SuccessResult,
  ServiceError,
  AuthStateChangeCallback,
  AuthSubscription,
} from '@/types/services';

import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

/**
 * Register a new user with email and password.
 *
 * @param email - User's email address
 * @param password - User's password (min 6 characters)
 * @returns Promise resolving to the created user or error
 */
async function register(email: string, password: string): Promise<AuthResult> {
  try {
    // Validate inputs
    if (!email || !password) {
      return {
        user: null,
        error: new Error('Email and password are required'),
      };
    }

    if (password.length < 6) {
      return {
        user: null,
        error: new Error('Password must be at least 6 characters long'),
      };
    }

    // Attempt to sign up the user
    const deepLink = Linking.createURL('sign-in');
    const emailRedirectTo = `https://ironliftapp.vercel.app/auth-callback?target=${encodeURIComponent(deepLink)}`;
    console.log('[AUTH] register emailRedirectTo:', emailRedirectTo);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      return { user: null, error };
    }

    return { user: data.user, error: null };
  } catch (err) {
    console.error('Registration error:', err);
    return {
      user: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Login an existing user with email and password.
 *
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise resolving to the authenticated user or error
 */
async function login(email: string, password: string): Promise<AuthResult> {
  try {
    // Validate inputs
    if (!email || !password) {
      return {
        user: null,
        error: new Error('Email and password are required'),
      };
    }

    // Attempt to sign in the user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error };
    }

    return { user: data.user, error: null };
  } catch (err) {
    console.error('Login error:', err);
    return {
      user: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Logout the current user.
 *
 * @returns Promise resolving to error status
 */
async function logout(): Promise<ServiceError> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('Logout error:', err);
    return {
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Send a password reset email to the user.
 *
 * @param email - User's email address
 * @returns Promise resolving to success status
 */
async function resetPassword(email: string): Promise<SuccessResult> {
  try {
    // Validate input
    if (!email) {
      return {
        success: false,
        error: new Error('Email is required'),
      };
    }

    // Attempt to send password reset email with explicit redirect URL
    const deepLink = Linking.createURL('reset-password');
    const redirectTo = `https://ironliftapp.vercel.app/auth-callback?target=${encodeURIComponent(deepLink)}`;
    console.log('[AUTH] resetPassword redirectTo:', redirectTo);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Reset password error:', err);
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Update the current user's password.
 * Used after PASSWORD_RECOVERY event.
 *
 * @param password - New password (min 6 characters)
 * @returns Promise resolving to success status
 */
async function updateUser(password: string): Promise<SuccessResult> {
  try {
    if (!password) {
      return {
        success: false,
        error: new Error('Password is required'),
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: new Error('Password must be at least 6 characters'),
      };
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Update user error:', err);
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Get the currently authenticated user.
 *
 * @returns Promise resolving to the current user or null
 */
async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Get current user error:', error);
      return null;
    }

    return data.user;
  } catch (err) {
    console.error('Get current user error:', err);
    return null;
  }
}

/**
 * Get the current session.
 *
 * @returns Promise resolving to the current session or null
 */
async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Get session error:', error);
      return null;
    }

    return data.session;
  } catch (err) {
    console.error('Get session error:', err);
    return null;
  }
}

/**
 * Listen for authentication state changes.
 *
 * @param callback - Function to call on auth state change
 * @returns Subscription object for cleanup, or null on error
 */
function onAuthStateChange(callback: AuthStateChangeCallback): AuthSubscription | null {
  try {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Execute the callback with event and session data
      callback(event, session);
    });

    // Return subscription for cleanup
    return subscription;
  } catch (err) {
    console.error('Auth state change listener error:', err);
    return null;
  }
}

/**
 * Auth service object implementing the AuthService interface.
 * Provides all authentication operations.
 */
export const auth: AuthService = {
  register,
  login,
  logout,
  resetPassword,
  updateUser,
  getCurrentUser,
  getSession,
  onAuthStateChange,
};
