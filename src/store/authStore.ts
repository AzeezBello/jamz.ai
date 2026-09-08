import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { setRememberSession, supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { fetchProfile, updateProfile } from '@/lib/api';
import { ApiError, type Profile } from '@/lib/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True until the first auth state resolution, so guards don't flash. */
  initializing: boolean;
  error: string | null;

  initialize: () => () => void;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ needsConfirmation: boolean }>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  saveProfile: (patch: Partial<Profile>) => Promise<void>;
}

/**
 * Called on every sign-out so no account's data is readable by the next one.
 * Registered by the other stores at module load to avoid an import cycle.
 */
const resetHandlers = new Set<() => void>();
export function onSignOut(handler: () => void) {
  resetHandlers.add(handler);
  return () => resetHandlers.delete(handler);
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  session: null,
  user: null,
  profile: null,
  initializing: true,
  error: null,

  initialize: () => {
    void supabase.auth.getSession().then(async ({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, initializing: false });
      if (data.session?.user) await get().refreshProfile();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      set({ session, user: session?.user ?? null, initializing: false });

      if (event === 'SIGNED_OUT' || !session) {
        set({ profile: null });
        resetHandlers.forEach((reset) => reset());
      } else {
        void get().refreshProfile();
      }
    });

    return () => subscription.subscription.unsubscribe();
  },

  signUp: async (email, password, displayName) => {
    set({ error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${env.siteUrl}/auth/callback`,
      },
    });
    if (error) throw new ApiError('signup_failed', error.message);

    // With email confirmation on, Supabase returns a user but no session.
    return { needsConfirmation: !data.session };
  },

  signIn: async (email, password, rememberMe = true) => {
    set({ error: null });
    setRememberSession(rememberMe);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new ApiError('invalid_credentials', error.message);
  },

  signInWithOAuth: async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${env.siteUrl}/auth/callback` },
    });
    if (error) throw new ApiError('oauth_failed', error.message);
  },

  requestPasswordReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.siteUrl}/reset-password`,
    });
    if (error) throw new ApiError('reset_failed', error.message);
  },

  updatePassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new ApiError('password_update_failed', error.message);
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
    resetHandlers.forEach((reset) => reset());
  },

  refreshProfile: async () => {
    const user = get().user ?? (await supabase.auth.getUser()).data.user;
    if (!user) return;
    try {
      set({ profile: await fetchProfile(user.id) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Could not load your profile.' });
    }
  },

  saveProfile: async (patch) => {
    const user = get().user;
    if (!user) throw new ApiError('not_authenticated', 'Sign in to continue.');
    const profile = await updateProfile(user.id, patch);
    set({ profile });
  },
}));

export const selectIsAuthenticated = (state: AuthState) => Boolean(state.session);
