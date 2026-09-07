/**
 * Public configuration. Only the anon key belongs here — it is safe in the
 * browser precisely because every table is behind RLS and every privileged
 * operation is a SECURITY DEFINER function.
 */
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  siteUrl: import.meta.env.VITE_SITE_URL ?? window.location.origin,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  posthogKey: import.meta.env.VITE_POSTHOG_KEY ?? '',
};

export const isConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
