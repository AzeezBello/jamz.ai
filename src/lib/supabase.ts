import { createClient } from '@supabase/supabase-js';
import { env, isConfigured } from './env';

/**
 * A single browser client. Sessions live in localStorage under Supabase's own
 * key and are cleared on sign-out — application data is never persisted
 * alongside them, which is what keeps one account's library from surviving
 * into the next account's session.
 */
export const supabase = createClient(
  env.supabaseUrl || 'http://localhost:54321',
  env.supabaseAnonKey || 'public-anon-key-not-set',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  },
);

export function assertConfigured() {
  if (!isConfigured) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
}
