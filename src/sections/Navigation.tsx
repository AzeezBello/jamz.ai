import { useState, useEffect } from 'react';
import UserMenu from '@/components/UserMenu';

interface NavigationProps {
  onOpenDashboard: () => void;
}

export default function Navigation({ onOpenDashboard }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'glass-strong py-3' : 'bg-transparent py-5'
      }`}
      style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#"
          className="text-2xl font-bold tracking-tight text-white hover:scale-105 transition-transform duration-200"
          style={{ animation: 'fade-slide-down 0.6s var(--ease-out-expo) forwards' }}
        >
          JAMZ
        </a>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {['Create', 'Discover', 'Pricing'].map((item, index) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="relative text-sm font-medium text-white/70 hover:text-white transition-colors duration-300 group"
              style={{
                animation: `fade-slide-down 0.5s var(--ease-out-expo) ${100 + index * 80}ms forwards`,
                opacity: 0,
              }}
            >
              {item}
              <span className="absolute -bottom-1 left-1/2 w-0 h-0.5 bg-[#ff6b6b] group-hover:w-full group-hover:left-0 transition-all duration-300" />
            </a>
          ))}
        </div>

        {/* User Menu */}
        <UserMenu onOpenDashboard={onOpenDashboard} />
      </div>
    </nav>
  );
}
