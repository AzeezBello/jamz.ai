import { useEffect, useRef, useState } from 'react';

const footerLinks = {
  Brand: ['About', 'Work at Jamz', 'Blog', 'Pricing'],
  Hub: ['Support', 'Help', 'Contact Us', 'Community Guidelines'],
  Legal: ['FAQs', 'Terms of Service', 'Privacy Policy'],
};

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
      { threshold: 0.1 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <footer ref={footerRef} className="py-16 px-6 border-t border-white/10">
      <div className="max-w-[1400px] mx-auto">
        {/* Top Border Animation */}
        <div
          className={`h-px bg-gradient-to-r from-transparent via-[#ff6b6b]/50 to-transparent mb-12 transition-all duration-1000 ${
            isVisible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
          }`}
          style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Logo Column */}
          <div
            className={`col-span-2 md:col-span-1 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)', transitionDelay: '200ms' }}
          >
            <a href="#" className="text-3xl font-bold text-white hover:scale-105 inline-block transition-transform">
              JAMZ
            </a>
            <p className="text-white/50 text-sm mt-4 max-w-xs">
              Make any song you can imagine with AI-powered music creation.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
            <div
              key={category}
              className={`transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{
                transitionTimingFunction: 'var(--ease-out-expo)',
                transitionDelay: `${300 + categoryIndex * 100}ms`,
              }}
            >
              <h4 className="text-white font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-white/50 text-sm hover:text-white transition-colors duration-200 relative group"
                    >
                      {link}
                      <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#ff6b6b] group-hover:w-full transition-all duration-300" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div
          className={`pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
          style={{ transitionTimingFunction: 'var(--ease-out-expo)', transitionDelay: '600ms' }}
        >
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} Jamz, Inc.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-white/40 text-sm hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="text-white/40 text-sm hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="text-white/40 text-sm hover:text-white transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
