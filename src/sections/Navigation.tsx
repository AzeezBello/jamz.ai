import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import UserMenu from '@/components/UserMenu';
import { LayoutDashboard, Library, CreditCard, Settings, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const LINKS = [
  { label: 'Create', to: '/' },
  { label: 'Discover', to: '/dashboard?tab=discover' },
  { label: 'Pricing', to: '/pricing' },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const session = useAuthStore((state) => state.session);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (session) {
    const links = [
      { label: 'Create', to: '/', icon: Sparkles },
      { label: 'Library', to: '/dashboard', icon: Library },
      { label: 'Discover', to: '/dashboard?tab=discover', icon: LayoutDashboard },
      { label: 'Billing', to: '/billing', icon: CreditCard },
      { label: 'Settings', to: '/settings', icon: Settings },
    ];

    return (
      <>
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-white/10 bg-[#080808] px-5 py-6">
          <Link to="/" className="text-2xl font-bold tracking-tight text-white mb-10">
            JAMZ
          </Link>
          <nav aria-label="Studio" className="space-y-1">
            {links.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={label}
                to={to}
                end={label === 'Create' || label === 'Library'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-[#ff6b6b] text-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`
                }
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto">
            <UserMenu />
          </div>
        </aside>
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#080808]/95 px-4 py-3 backdrop-blur">
          <Link to="/" className="text-xl font-bold">
            JAMZ
          </Link>
          <UserMenu />
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

        <UserMenu />
      </div>
    </nav>
  );
}
