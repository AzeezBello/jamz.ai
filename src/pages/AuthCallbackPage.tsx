import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * Landing point for email confirmation and OAuth redirects. The client is
 * configured with `detectSessionInUrl`, so the exchange has usually already
 * happened by the time this renders; this just reports the outcome.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(params.get('error_description'));

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      navigate(data.session ? '/dashboard' : '/', { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold mb-3">We couldn't sign you in</h1>
        <p className="text-white/50 max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      <span className="sr-only">Completing sign-in…</span>
    </div>
  );
}
