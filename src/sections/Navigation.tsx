import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import UserMenu from '@/components/UserMenu';
import NotificationBell from '@/components/NotificationBell';
import {
  LayoutDashboard,
  Library,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

const LINKS = [
  { label: 'Create', to: '/' },
  { label: 'Discover', to: '/dashboard?tab=discover' },
  { label: 'Pricing', to: '/pricing' },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const { pathname, search } = useLocation();
  const session = useAuthStore((state) => state.session);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (session) {
    // Library and Discover share a path and differ only by query string.
    // NavLink matches on pathname alone, so both lit up at once — active state
    // is worked out here instead.
    const discovering = pathname === '/dashboard' && search.includes('tab=discover');
    const links = [
      { label: 'Create', to: '/', icon: Sparkles, active: pathname === '/' },
      {
        label: 'Library',
        to: '/dashboard',
        icon: Library,
        active: pathname === '/dashboard' && !discovering,
      },
      {
        label: 'Discover',
        to: '/dashboard?tab=discover',
        icon: LayoutDashboard,
        active: discovering,
      },
      { label: 'Billing', to: '/billing', icon: CreditCard, active: pathname === '/billing' },
      { label: 'Settings', to: '/settings', icon: Settings, active: pathname === '/settings' },
    ];

    return (
      <>
        <aside
          className={`hidden md:flex fixed inset-y-0 left-0 z-50 flex-col border-r border-white/10 bg-[#080808] py-6 transition-[width] duration-200 ${
            collapsed ? 'w-[72px] px-3' : 'w-64 px-5'
          }`}
        >
          <div
            className={`flex items-center mb-10 ${collapsed ? 'justify-center' : 'justify-between'}`}
          >
            {!collapsed && (
              <Link to="/" className="text-2xl font-bold tracking-tight text-white">
                JAMZ
              </Link>
            )}
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
                  // The label is the accessible name when it is visible; when
                  // collapsed the aria-label carries it instead, so the link is
                  // never announced as bare icon.
                  aria-label={collapsed ? label : undefined}
                  className={`flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    collapsed ? 'justify-center px-0' : 'px-3'
                  } ${
                    active
                      ? 'bg-[#ff6b6b] text-black'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {!collapsed && label}
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

          <div className="mt-auto">
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
