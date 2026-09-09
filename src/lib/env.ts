/**
 * Public configuration.
 *
 * Only the anon/publishable key belongs here — it is safe in the browser
 * precisely because every table is behind RLS and every privileged operation
 * is a SECURITY DEFINER function.
 *
 * Two naming conventions are accepted. Supabase's dashboard now hands out
 * `PUBLIC_*` / `PUBLISHABLE_KEY` names, while the CLI and older docs use
 * `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Reading both means pasting
 * either straight from the dashboard just works, instead of silently landing
 * on the "needs its backend" screen.
 */
const read = (...names: string[]): string => {
  for (const name of names) {
    const value = import.meta.env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

export const env = {
  supabaseUrl: read('VITE_SUPABASE_URL', 'VITE_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: read(
    'VITE_SUPABASE_ANON_KEY',
    'VITE_PUBLIC_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ),
  siteUrl: read('VITE_SITE_URL') || window.location.origin,
  sentryDsn: read('VITE_SENTRY_DSN'),
  posthogKey: read('VITE_POSTHOG_KEY'),
};

export const isConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
