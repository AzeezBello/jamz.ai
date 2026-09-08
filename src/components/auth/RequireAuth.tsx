import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

/**
 * Route guard. This is a UX affordance only — the real boundary is RLS, which
 * refuses the data regardless of what the browser renders.
 */
export default function RequireAuth() {
  const session = useAuthStore((s) => s.session);
  const initializing = useAuthStore((s) => s.initializing);
  const location = useLocation();

  if (initializing) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        <span className="sr-only">Checking your session…</span>
      </div>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: `${location.pathname}${location.search}`, requireAuth: true }}
      />
    );
  }

  return <Outlet />;
}
