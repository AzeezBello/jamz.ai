import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import ErrorBoundary from '@/components/layout/ErrorBoundary';
import Landing from '@/pages/Landing';

// Everything past the landing page is loaded on demand; the marketing page is
// the only route most visitors ever see.
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const SongPage = lazy(() => import('@/pages/SongPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const BillingPage = lazy(() => import('@/pages/BillingPage'));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
import SetupRequiredPage from '@/pages/SetupRequiredPage';
import { useAuthStore } from '@/store/authStore';
import { isConfigured } from '@/lib/env';

function RouteFallback() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    if (!isConfigured) return;
    return initialize();
  }, [initialize]);

  // Without a backend the app would silently pretend to work, which is the
  // failure mode this rewrite exists to remove.
  if (!isConfigured) return <SetupRequiredPage />;

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/song/:id" element={<SongPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route element={<RequireAuth />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/library" element={<Navigate to="/dashboard" replace />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/billing" element={<BillingPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster theme="dark" position="bottom-center" richColors />
    </ErrorBoundary>
  );
}

export default App;
