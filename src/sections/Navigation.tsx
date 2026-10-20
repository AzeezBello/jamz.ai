import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import UserMenu from '@/components/UserMenu';
import NotificationBell from '@/components/NotificationBell';
import {
  CreditCard,
  FlaskConical,
  Heart,
  Home,
  LayoutDashboard,
  Library,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { isAppRoute } from '@/lib/app-routes';

const LINKS = [
  { label: 'Create', to: '/' },
  { label: 'Discover', to: '/dashboard?tab=discover' },
  { label: 'Pricing', to: '/pricing' },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const { pathname, search } = useLocation();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (session && isAppRoute(pathname)) {
    // Home, Library, Discover, and Favourites share /dashboard and differ by query string.
    const homeActive = pathname === '/dashboard' && search.includes('tab=home');
    const discovering = pathname === '/dashboard' && search.includes('tab=discover');
    const favouriting = pathname === '/dashboard' && search.includes('tab=favourites');
    const libraryActive =
      pathname === '/dashboard' && !homeActive && !discovering && !favouriting;
    const links = [
      {
        label: 'Home',
        to: '/dashboard?tab=home',
        icon: Home,
        active: homeActive,
      },
      {
        label: 'Create',
        to: '/create',
        icon: Sparkles,
        active: pathname === '/create',
      },
      {
        label: 'Library',
        to: '/dashboard',
        icon: Library,
        active: libraryActive,
      },
      {
        label: 'Discover',
        to: '/dashboard?tab=discover',
        icon: LayoutDashboard,
        active: discovering,
      },
      {
        label: 'Favourites',
        to: '/dashboard?tab=favourites',
        icon: Heart,
        active: favouriting,
      },
      {
        label: 'Labs',
        to: '/labs',
        icon: FlaskConical,
        active: pathname === '/labs',
      },
      { label: 'Billing', to: '/billing', icon: CreditCard, active: pathname === '/billing' },
      { label: 'Settings', to: '/settings', icon: Settings, active: pathname === '/settings' },
    ];

    return (
      <>
        <aside
          className={`hidden md:flex fixed inset-y-0 left-0 z-50 flex-col border-r border-white/10 bg-[#080808] py-6 transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            collapsed ? 'w-[72px] px-3' : 'w-64 px-5'
          }`}
        >
          <div
            className={`flex items-center mb-8 ${collapsed ? 'flex-col gap-4' : 'justify-between'}`}
          >
            <Link
              to="/"
              className="text-2xl font-bold tracking-tight text-white hover:text-[#ff6b6b] transition-colors"
              aria-label="Jamz home"
            >
              {collapsed ? 'J' : 'JAMZ'}
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  aria-expanded={!collapsed}
                  className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6b6b]"
                >
                  {collapsed ? (
                    <PanelLeftOpen className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <PanelLeftClose className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1a1a1a] border-white/10 text-white">
                {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              </TooltipContent>
            </Tooltip>
          </div>

          <nav aria-label="Studio" className="space-y-1">
            {links.map(({ label, to, icon: Icon, active }) => {
              const item = (
                <Link
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  aria-label={collapsed ? label : undefined}
                  className={`flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all duration-150 ease-out active:scale-[0.98] ${
                    collapsed ? 'justify-center px-0' : 'px-3'
                  } ${
                    active
                      ? 'bg-[#ff6b6b] text-black shadow-xs'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {!collapsed && (
                    <span className="flex items-center justify-between flex-1">
                      <span>{label}</span>
                      {label === 'Labs' && (
                        <span
                          aria-hidden="true"
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            active ? 'bg-black/20 text-black' : 'bg-white/10 text-white/70'
                          }`}
                        >
                          Beta
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              );

              return collapsed ? (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>{item}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#1a1a1a] border-white/10 text-white">
                    {label}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div key={label}>{item}</div>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3">
            {!collapsed && (!profile?.plan_id || profile.plan_id === 'free') && (
              <Link
                to="/billing"
                aria-label="Upgrade to Jamz Pro plan"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-gradient-to-r from-[#ff6b6b]/15 via-pink-500/10 to-amber-500/15 px-3.5 py-2.5 text-xs font-semibold text-white hover:border-[#ff6b6b]/40 transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#ff6b6b]" aria-hidden="true" />
                  Upgrade to Pro
                </span>
                <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] text-white/90">
                  v5 Max
                </span>
              </Link>
            )}

            <div className={`flex items-center gap-1 ${collapsed ? 'flex-col' : ''}`}>
              <NotificationBell />
              <UserMenu compact={collapsed} />
            </div>
          </div>
        </aside>
        {/* Below md the sidebar is hidden, and until now that left no way to
            reach Library, Billing or Settings on a phone at all. */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#080808]/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-1">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open navigation"
                  className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <Menu className="w-5 h-5" aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 border-white/10 bg-[#080808] text-white">
                <SheetHeader>
                  <SheetTitle className="text-white">JAMZ</SheetTitle>
                </SheetHeader>
                <nav aria-label="Studio mobile" className="space-y-1 px-4">
                  {links.map(({ label, to, icon: Icon, active }) => (
                    <Link
                      key={label}
                      to={to}
                      onClick={() => setMobileNavOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-[#ff6b6b] text-black'
                          : 'text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      {label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <Link to="/" className="text-xl font-bold">
              JAMZ
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <NotificationBell />
            <UserMenu compact />
          </div>
        </div>
      </>
    );
  }

  return (
    <nav
      aria-label="Main"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'glass-strong py-3' : 'bg-transparent py-5'
      }`}
      style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
        <Link
          to="/"
          className="text-2xl font-bold tracking-tight text-white hover:scale-105 transition-transform duration-200 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b6b]"
        >
          JAMZ
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              aria-current={pathname === link.to ? 'page' : undefined}
              className="relative text-sm font-medium text-white/70 hover:text-white transition-colors duration-300 group rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b6b]"
            >
              {link.label}
              <span className="absolute -bottom-1 left-1/2 w-0 h-0.5 bg-[#ff6b6b] group-hover:w-full group-hover:left-0 transition-all duration-300" />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
