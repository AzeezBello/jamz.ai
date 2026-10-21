import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Copyright,
  Layout,
  Share2,
  Sliders,
  Sparkles,
  Waves,
} from 'lucide-react';

const DAILY_SEGMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const FADERS = [
  { label: 'STYLE INFLUENCE', value: 84, unit: '%', accent: '#ff6b6b' },
  { label: 'WEIRDNESS / ENTROPY', value: 32, unit: '%', accent: '#ffb168' },
  { label: 'VOCAL PRESENCE', value: 76, unit: '%', accent: '#ff8e8e' },
];

const STEM_BUS_PREVIEW = [
  { id: '01', name: 'LEAD VOCAL', db: '-1.2 dB', width: '82%' },
  { id: '02', name: 'DRUM KIT BUS', db: '-2.4 dB', width: '91%' },
  { id: '03', name: 'ANALOG SUB', db: '-3.0 dB', width: '68%' },
  { id: '04', name: 'TAPE SYNTHS', db: '-4.8 dB', width: '56%' },
];

export default function Features() {
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
      id="create"
      className="py-24 sm:py-28 px-4 sm:px-6 relative border-b border-white/[0.07]"
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Asymmetric Editorial Header */}
        <div
          className={`flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14 motion-reveal ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div>
            <div className="inline-flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.18em] text-[#ff8e8e] mb-4">
              <Waves className="w-3.5 h-3.5" aria-hidden="true" />
              03 // ARCHITECTURE &amp; CAPABILITIES
            </div>
            <h2 className="font-display text-display-section font-bold text-white max-w-[20ch]">
              Everything you need to make music your way
            </h2>
          </div>
          <p className="text-white/60 max-w-[46ch] text-base leading-relaxed lg: pb-1">
            Built like a modern hardware workstation and accessible from any browser. Sketch ideas
            for free or dial in every stem for commercial release.
          </p>
        </div>

        {/* Asymmetric 12-Column Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Cell 1 (Span 7): 10 Free Songs Daily + Credit Meter Artifact */}
          <article
            className={`md:col-span-7 studio-surface card-lift rounded-2xl p-6 sm:p-8 flex flex-col justify-between motion-reveal ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <span className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-white/45">
                  01 / DAILY ALLOCATION
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff6b6b]/30 bg-[#ff6b6b]/10 px-3 py-1 font-mono-tech text-[11px] font-medium text-[#ff8e8e]">
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  50 CREDITS / DAY
                </span>
              </div>

              <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
                10 free songs, daily
              </h3>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed max-w-[56ch]">
                Turn any moment into custom music without a subscription. Your daily credit
                allowance refreshes automatically every 24 hours so you always have tape to roll.
              </p>
            </div>

            {/* Interactive-Style Segmented Studio Meter */}
            <div className="studio-well rounded-xl p-4 mt-8">
              <div className="flex items-center justify-between font-mono-tech text-[11px] text-white/60 mb-2.5">
                <span>SESSION METER // 10 FULL TAKES</span>
                <span className="text-[#ffb168]">AUTO-REFILL ACTIVE</span>
              </div>
              <div className="grid grid-cols-10 gap-1.5" aria-hidden="true">
                {DAILY_SEGMENTS.map((seg) => (
                  <div
                    key={seg}
                    className={`h-6 rounded-sm ${
                      seg <= 8
                        ? 'gradient-coral shadow-[0_0_12px_rgba(255,107,107,0.35)]'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between font-mono-tech text-[10px] text-white/40 mt-2">
                <span>5 CREDITS PER SONG</span>
                <span>INCLUDES FULL VOCALS + LYRICS</span>
              </div>
            </div>
          </article>

          {/* Cell 2 (Span 5): Granular Creation Controls + Parameter Fader Bank */}
          <article
            className={`md:col-span-5 studio-surface card-lift rounded-2xl p-6 sm:p-8 flex flex-col justify-between motion-reveal ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
            style={{ transitionDelay: '180ms' }}
          >
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <span className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-white/45">
                  02 / PARAMETER STEERING
                </span>
                <Sliders className="w-4 h-4 text-[#ff6b6b]" aria-hidden="true" />
              </div>

              <h3 className="font-display text-2xl font-bold text-white mb-3">
                Granular creation controls
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Steer arrangements with Personas, reference audio, vocal gender, negative style
                exclusions, and continuous weirdness and style-adherence sliders.
              </p>
            </div>

            <div className="studio-well rounded-xl p-4 mt-8 space-y-3.5" aria-hidden="true">
              {FADERS.map((fader) => (
                <div key={fader.label}>
                  <div className="flex items-center justify-between font-mono-tech text-[11px] mb-1.5">
                    <span className="text-white/65">{fader.label}</span>
                    <span className="text-white font-semibold">
                      {fader.value}
                      {fader.unit}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${fader.value}%`, backgroundColor: fader.accent }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Cell 3 (Span 5): Complete Creative Workspace + Multi-Track Bus */}
          <article
            className={`md:col-span-5 studio-surface card-lift rounded-2xl p-6 sm:p-8 flex flex-col justify-between motion-reveal ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
            style={{ transitionDelay: '260ms' }}
          >
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <span className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-white/45">
                  03 / WEB DAW WORKSPACE
                </span>
                <Layout className="w-4 h-4 text-[#ffb168]" aria-hidden="true" />
              </div>

              <h3 className="font-display text-2xl font-bold text-white mb-3">
                Your complete creative workspace
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Organize takes into project crates, audition stems in real time, and refine lyrics
                in a focused browser workstation built for fast iteration.
              </p>
            </div>

            <div className="studio-well rounded-xl p-3.5 mt-8 space-y-2" aria-hidden="true">
              {STEM_BUS_PREVIEW.map((stem) => (
                <div
                  key={stem.id}
                  className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-2.5 py-1.5 border border-white/[0.05]"
                >
                  <span className="font-mono-tech text-[10px] text-white/40">{stem.id}</span>
                  <span className="font-mono-tech text-[11px] text-white/80 w-28 truncate">
                    {stem.name}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                    <div
                      className="h-full gradient-coral rounded-full"
                      style={{ width: stem.width }}
                    />
                  </div>
                  <span className="font-mono-tech text-[10px] text-white/50">{stem.db}</span>
                </div>
              ))}
            </div>
          </article>

          {/* Cell 4 (Span 7): Commercial Rights + Global Sharing Deck */}
          <article
            className={`md:col-span-7 studio-surface card-lift rounded-2xl p-6 sm:p-8 flex flex-col justify-between motion-reveal ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
            style={{ transitionDelay: '340ms' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="inline-flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.16em] text-white/45 mb-4">
                  <Copyright className="w-3.5 h-3.5 text-[#ff6b6b]" aria-hidden="true" />
                  04 / MASTER OWNERSHIP
                </div>
                <h3 className="font-display text-2xl font-bold text-white mb-2.5">
                  Commercial rights to your songs
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Every track generated on an active Pro or Premier plan carries full commercial-use
                  rights for streaming platforms, client sync, and album releases.
                </p>
              </div>

              <div className="sm:border-l sm:border-white/[0.08] sm:pl-6">
                <div className="inline-flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.16em] text-white/45 mb-4">
                  <Share2 className="w-3.5 h-3.5 text-[#ffb168]" aria-hidden="true" />
                  05 / INSTANT PUBLISHING
                </div>
                <h3 className="font-display text-2xl font-bold text-white mb-2.5">
                  Share it with the world
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Keep work-in-progress takes private, share unlisted review links with collaborators,
                  or publish finished cuts to the public Discover feed.
                </p>
              </div>
            </div>

            <div className="studio-well rounded-xl p-4 mt-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {['100% ROYALTY-FREE', 'STREAMING CLEARED', 'UNLISTED CLIENT LINKS', 'WAV + MP3'].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono-tech text-[10px] tracking-[0.12em] text-white/70"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>

              <Link
                to="/pricing"
                className="inline-flex items-center gap-1.5 font-mono-tech text-xs font-semibold text-[#ff8e8e] hover:text-white transition-colors"
              >
                Compare licensing tiers
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
