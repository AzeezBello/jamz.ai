import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import UserMenu from '@/components/UserMenu';

const LINKS = [
  { label: 'Create', to: '/' },
  { label: 'Discover', to: '/dashboard?tab=discover' },
  { label: 'Pricing', to: '/pricing' },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
