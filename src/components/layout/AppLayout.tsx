import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navigation from '@/sections/Navigation';
import Footer from '@/sections/Footer';
import AudioPlayer from '@/components/audio/AudioPlayer';
import GenerationModal from '@/components/modals/GenerationModal';
import { useAuthStore } from '@/store/authStore';
import { useGenerationStore } from '@/store/generationStore';
import { usePlayerStore } from '@/store/playerStore';

export default function AppLayout() {
  const { pathname } = useLocation();
  const session = useAuthStore((s) => s.session);
  const resume = useGenerationStore((s) => s.resume);
  const hasPlayer = usePlayerStore((s) => Boolean(s.currentSong));

  // A generation started before a refresh is still running on the server;
  // pick the progress back up instead of losing it.
  useEffect(() => {
    if (session) void resume();
  }, [session, resume]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:text-black focus:font-semibold"
      >
        Skip to content
      </a>
      <Navigation />
      <main id="main" className={hasPlayer ? 'pb-24' : ''}>
        <Outlet />
      </main>
      <Footer />
      <AudioPlayer />
      <GenerationModal />
    </div>
  );
}
