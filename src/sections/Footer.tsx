import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { footerGroups, legalLinks, type SiteLink } from '@/lib/site-links';

const linkClass =
  'text-white/55 text-sm hover:text-white transition-colors duration-200 relative group rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6b6b]';

function FooterLink({ link }: { link: SiteLink }) {
  const underline = (
    <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#ff6b6b] group-hover:w-full transition-all duration-300" />
  );

  if (link.internal) {
    return (
      <Link to={link.href} className={linkClass}>
        {link.label}
        {underline}
      </Link>
    );
  }

  return (
    <a
      href={link.href}
      target={link.href.startsWith('mailto:') ? undefined : '_blank'}
      rel="noreferrer"
      className={linkClass}
    >
      {link.label}
      {underline}
    </a>
  );
}

export default function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <footer
      ref={footerRef}
      className="py-16 sm:py-20 px-4 sm:px-6 border-t border-white/[0.08] bg-[#060608]"
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-10 mb-14">
          {/* Brand & Studio Telemetry Column */}
          <div
            className={`sm:col-span-2 md:col-span-5 motion-reveal ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <Link
                to="/"
                className="font-display text-3xl font-extrabold tracking-[-0.04em] text-white hover:text-[#ff8e8e] transition-colors"
              >
                JAMZ
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono-tech text-[10px] uppercase tracking-[0.14em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                ALL ENGINES ONLINE
              </span>
            </div>
            <p className="text-white/55 text-sm leading-relaxed max-w-[38ch]">
              Browser-native generative audio workstation. Compose original vocal tracks, extract
              12-channel WAV stems, and own your masters.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerGroups)
            .filter(([, links]) => links.length > 0)
            .map(([category, links], categoryIndex) => (
              <div
                key={category}
                className={`md:col-span-3 motion-reveal ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{
                  transitionDelay: `${120 + categoryIndex * 80}ms`,
                }}
              >
                <h4 className="font-mono-tech text-xs uppercase tracking-[0.18em] text-white/75 font-semibold mb-4">
                  0{categoryIndex + 1} // {category}
                </h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <FooterLink link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>

        {/* Bottom Colophon */}
        <div
          className={`pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 motion-reveal ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '280ms' }}
        >
          <p className="font-mono-tech text-white/40 text-xs">
            © {new Date().getFullYear()} Jamz, Inc. · 48kHz / 24-Bit Neural Audio
          </p>
          <div className="flex flex-wrap items-center gap-6">
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="font-mono-tech text-white/45 text-xs hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
