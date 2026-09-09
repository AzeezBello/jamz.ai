import { lazy, Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navigation from '@/sections/Navigation';
import Footer from '@/sections/Footer';
import AudioPlayer from '@/components/audio/AudioPlayer';
import GenerationModal from '@/components/modals/GenerationModal';
// Guidance surfaces are occasional — the intro shows once and the tour is
// opt-in — so they should not sit in the shell everyone downloads.
const OnboardingDialog = lazy(() => import('@/components/onboarding/OnboardingDialog'));
const ProductTour = lazy(() => import('@/components/onboarding/ProductTour'));
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/store/authStore';
import { useGenerationStore } from '@/store/generationStore';
import { usePlayerStore } from '@/store/playerStore';
import { useUiStore } from '@/store/uiStore';
import { trackPageView } from '@/lib/observability';
import TopBar from './TopBar';
import { isAppRoute } from '@/lib/app-routes';

export default function AppLayout() {
  const { pathname } = useLocation();
  const session = useAuthStore((s) => s.session);
  const resume = useGenerationStore((s) => s.resume);
  const hasPlayer = usePlayerStore((s) => Boolean(s.currentSong));
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const showTopBar = Boolean(session) && isAppRoute(pathname);

  // A generation started before a refresh is still running on the server;
  // pick the progress back up instead of losing it.
  useEffect(() => {
    if (session) void resume();
  }, [session, resume]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    trackPageView(pathname);
  }, [pathname]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-black text-white overflow-x-hidden">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:text-black focus:font-semibold"
        >
          Skip to content
        </a>
        <Navigation />
        <main
          id="main"
          className={`${
            session ? (collapsed ? 'md:pl-[72px]' : 'md:pl-64') : ''
          } ${session ? 'pt-14 md:pt-0' : ''} transition-[padding] duration-200 ${
            hasPlayer ? 'pb-24' : ''
          }`}
        >
          {showTopBar && <TopBar />}
          <Outlet />
        </main>
        <Footer />
        <AudioPlayer />
        <GenerationModal />
        <Suspense fallback={null}>
          <OnboardingDialog />
          <ProductTour />
        </Suspense>
      </div>
    </TooltipProvider>
  );
}
