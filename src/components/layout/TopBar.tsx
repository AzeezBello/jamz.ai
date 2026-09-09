import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Compass, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';

function usePageTitle(): string {
  const { pathname } = useLocation();
  const [params] = useSearchParams();

  if (pathname === '/settings') return 'Settings';
  if (pathname === '/billing') return 'Billing';
  if (pathname === '/dashboard') {
    return params.get('tab') === 'discover' ? 'Discover' : 'My Library';
  }
  return 'Jamz';
}

/**
 * Shared header for the signed-in app routes.
 *
 * The dashboard used to carry its own title, credit chip and tour button, so
 * Settings and Billing had none. Hoisting them here means every app route is
 * framed the same way and the pieces exist in one place.
 */
export default function TopBar() {
  const title = usePageTitle();
  const profile = useAuthStore((state) => state.profile);
  const openTour = useOnboardingStore((state) => state.openTour);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <h1 className="text-lg font-semibold text-white truncate">{title}</h1>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={openTour}
            className="text-white/50 hover:text-white"
          >
            <Compass className="w-4 h-4 mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Take the tour</span>
          </Button>

          <Link
            to="/billing"
            aria-label={`${profile?.credit_balance ?? 0} credits, view billing`}
            className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-sm transition-colors hover:bg-white/10"
          >
            <Sparkles className="w-4 h-4 text-[#ff6b6b]" aria-hidden="true" />
            <span className="text-white">{profile?.credit_balance ?? 0}</span>
            <span className="hidden sm:inline text-white/50">credits</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
