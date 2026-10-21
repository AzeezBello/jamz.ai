import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { appStoreLinks } from '@/lib/site-links';
import { Apple, Mic, Smartphone, Star } from 'lucide-react';

const PLATFORMS = [
  {
    id: 'ios',
    badge: 'IOS // CORE AUDIO ENGINE',
    rating: '4.9',
    reviews: '363k+ ratings',
    image: '/images/app-iphone.jpg',
    alt: 'Jamz iPhone App',
    icon: Apple,
    cta: 'Download on iPhone',
    href: appStoreLinks.ios,
  },
  {
    id: 'android',
    badge: 'ANDROID // LOW-LATENCY BUS',
    rating: '4.8',
    reviews: '653k+ ratings',
    image: '/images/app-android.jpg',
    alt: 'Jamz Android App',
    icon: Smartphone,
    cta: 'Download on Android',
    href: appStoreLinks.android,
  },
];

export default function MobileApp() {
  const sectionRef = useRef<HTMLElement>(null);
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

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-20 sm:py-28 px-4 sm:px-6 relative border-b border-white/[0.07]"
    >
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Left Column: Editorial Field Recorder Story */}
        <div
          className={`lg:col-span-5 motion-reveal ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.18em] text-[#ff8e8e] mb-4">
            <Mic className="w-3.5 h-3.5" aria-hidden="true" />
            06 // POCKET FIELD RECORDER
          </div>
          <h2 className="font-display text-display-section font-bold text-white mb-4">
            The #1 AI music app
          </h2>
          <p className="text-white/60 text-base sm:text-lg leading-relaxed max-w-[46ch] mb-8">
            Capture a voice memo on the train, hum a hook between meetings, and sync full
            multi-track projects straight to your desktop studio.
          </p>

          <div className="studio-surface rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-mono-tech text-[11px] uppercase tracking-[0.15em] text-white/50">
                CROSS-DEVICE WORKFLOW
              </span>
              <span className="font-mono-tech text-xs text-[#ffb168]">CLOUD SYNC LIVE</span>
            </div>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li className="flex items-center justify-between gap-2">
                <span>Voice-to-Instrument Conditioning</span>
                <span className="font-mono-tech text-[11px] text-white/45">24-Bit Capture</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>Offline Library Caching</span>
                <span className="font-mono-tech text-[11px] text-white/45">Instant Playback</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>Desktop Crate Continuity</span>
                <span className="font-mono-tech text-[11px] text-white/45">Zero-Config Sync</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Dual Hardware Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {PLATFORMS.map((platform, idx) => {
            const Icon = platform.icon;
            return (
              <article
                key={platform.id}
                className={`group studio-surface card-lift rounded-2xl overflow-hidden flex flex-col justify-between motion-reveal ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
                style={{ transitionDelay: `${180 + idx * 120}ms` }}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="font-mono-tech text-[10px] uppercase tracking-[0.15em] text-white/55">
                      {platform.badge}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 font-mono-tech text-[10px] text-white/80">
                      <Star className="w-3 h-3 text-[#ffb168]" fill="currentColor" />
                      Top 10
                    </span>
                  </div>

                  {/* Rating Ledger */}
                  <div className="flex items-baseline gap-3 mb-5">
                    <span className="font-mono-tech text-3xl font-bold text-white">
                      {platform.rating}
                    </span>
                    <div className="flex items-center gap-0.5" aria-hidden="true">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-3.5 h-3.5 text-[#ffb168]"
                          fill="currentColor"
                        />
                      ))}
                    </div>
                    <span className="font-mono-tech text-xs text-white/45 ml-auto">
                      {platform.reviews}
                    </span>
                  </div>

                  {/* Device Preview */}
                  <div className="relative aspect-[4/4.5] rounded-xl overflow-hidden mb-5 border border-white/10 bg-black">
                    <img
                      src={platform.image}
                      alt={platform.alt}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>

                  {platform.href ? (
                    <Button
                      asChild
                      className="w-full bg-white text-black hover:bg-white/90 font-semibold rounded-xl py-5"
                    >
                      <a
                        href={platform.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2"
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        {platform.cta}
                      </a>
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="w-full bg-white/[0.07] border border-white/10 text-white/55 font-semibold rounded-xl py-5 flex items-center justify-center gap-2"
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      Coming soon
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
