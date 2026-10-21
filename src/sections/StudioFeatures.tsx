import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Cpu, Download, FolderGit2, Wand2 } from 'lucide-react';

const studioFeatures = [
  {
    id: '01',
    tag: 'ARRANGEMENT & LYRIC ENGINE',
    icon: Wand2,
    title: 'Experience the modern song maker',
    description:
      'Start, edit, and remix on your own terms. Upload reference audio, rewrite individual verses, reorder chorus sections, and reshape vocal delivery without losing the groove.',
    specs: ['SECTION REORDERING', 'AI LYRIC CO-WRITER', 'REFERENCE AUDIO INJECT'],
    artifact: 'arranger' as const,
  },
  {
    id: '02',
    tag: 'COMMERCIAL MASTER VAULT',
    icon: FolderGit2,
    title: 'Create everyday. Keep it all.',
    description:
      'Generate up to 500 custom songs a month with full commercial rights on the Pro plan. Organize takes into project crates, break genre boundaries, and own every master you press.',
    specs: ['500 SONGS / MONTH', 'ROYALTY-FREE MASTERS', 'PROJECT VERSION CRATES'],
    artifact: 'vault' as const,
  },
  {
    id: '03',
    tag: 'MULTI-TRACK STEM SEPARATION',
    icon: Download,
    title: 'Extract stems. Drop into your DAW.',
    description:
      'Export up to 12 time-aligned WAV stems and drag them straight into Ableton, Logic, FL Studio, or Pro Tools. Clean, phase-coherent, and ready for professional mixing.',
    specs: ['12 TIME-ALIGNED WAVS', '48kHz / 24-BIT PCM', 'ZERO TEMPO DRIFT'],
    artifact: 'stems' as const,
  },
];

function StudioArtifact({ kind }: { kind: 'arranger' | 'vault' | 'stems' }) {
  if (kind === 'arranger') {
    return (
      <div className="studio-surface rounded-2xl p-5 sm:p-6 space-y-4" aria-hidden="true">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <span className="font-mono-tech text-[11px] text-white/60">
            ARRANGER // TIMELINE VIEW
          </span>
          <span className="font-mono-tech text-xs text-[#ff8e8e]">01:14.08 · 118 BPM</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { name: 'INTRO', bars: 'BARS 01-08', active: false },
            { name: 'VERSE 01', bars: 'BARS 09-24', active: true },
            { name: 'CHORUS', bars: 'BARS 25-40', active: false },
          ].map((sec) => (
            <div
              key={sec.name}
              className={`rounded-xl p-3 border ${
                sec.active
                  ? 'border-[#ff6b6b]/50 bg-[#ff6b6b]/10'
                  : 'border-white/[0.08] bg-white/[0.02]'
              }`}
            >
              <p className="font-mono-tech text-[10px] text-white/45">{sec.bars}</p>
              <p className="font-mono-tech text-xs font-semibold text-white mt-0.5">{sec.name}</p>
            </div>
          ))}
        </div>

        <div className="studio-well rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between font-mono-tech text-[10px] text-white/45">
            <span>[VERSE 01 · VOCAL LEAD]</span>
            <span className="text-[#ffb168]">SYLLABLE LOCK</span>
          </div>
          <p className="text-sm text-white/90 font-medium">
            &ldquo;I keep the light on out past midnight,&rdquo;
          </p>
          <p className="text-sm text-white/55">
            &ldquo;and the city keeps its own time on the tape.&rdquo;
          </p>
        </div>
      </div>
    );
  }

  if (kind === 'vault') {
    return (
      <div className="studio-surface rounded-2xl p-5 sm:p-6 space-y-4" aria-hidden="true">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <span className="font-mono-tech text-[11px] text-white/60">
            MASTER VAULT // COMMERCIAL LEDGER
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 font-mono-tech text-[10px] text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            CLEARED
          </span>
        </div>

        <div className="space-y-2.5">
          {[
            { title: 'Midnight Tape LP', count: '14 takes', rights: 'COMMERCIAL MASTER' },
            { title: 'Neon Club Edits (v5 Max)', count: '28 takes', rights: 'COMMERCIAL MASTER' },
            { title: 'Acoustic Film Cues', count: '9 takes', rights: 'SYNC CLEARED' },
          ].map((crate) => (
            <div
              key={crate.title}
              className="studio-well rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-semibold text-white">{crate.title}</p>
                <p className="font-mono-tech text-[11px] text-white/45">{crate.count}</p>
              </div>
              <span className="rounded border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono-tech text-[10px] text-[#ffb168]">
                {crate.rights}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="studio-surface rounded-2xl p-5 sm:p-6 space-y-4" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <span className="font-mono-tech text-[11px] text-white/60">
          STEM EXPORT // 48kHz WAV BUS
        </span>
        <span className="font-mono-tech text-[11px] text-[#ff8e8e]">12 / 12 ALIGNED</span>
      </div>

      <div className="space-y-2">
        {[
          { file: '01_Lead_Vocals_Dry.wav', bars: [65, 85, 45, 92, 78, 60, 88, 70] },
          { file: '02_Brushed_Kit_Stereo.wav', bars: [90, 50, 95, 55, 90, 60, 92, 58] },
          { file: '03_Moog_Sub_Bass.wav', bars: [75, 78, 82, 80, 74, 85, 79, 72] },
          { file: '04_Analog_Poly_Pad.wav', bars: [45, 62, 68, 74, 65, 58, 64, 52] },
        ].map((stem) => (
          <div
            key={stem.file}
            className="studio-well rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-4"
          >
            <span className="font-mono-tech text-xs text-white/85 truncate">{stem.file}</span>
            <div className="flex items-end gap-1 h-5 shrink-0">
              {stem.bars.map((h, idx) => (
                <span
                  key={idx}
                  className="w-1 rounded-full gradient-coral"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {['Ableton Live', 'Logic Pro', 'FL Studio', 'Pro Tools'].map((daw) => (
          <span
            key={daw}
            className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono-tech text-[10px] text-white/60"
          >
            {daw}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function StudioFeatures() {
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
      className="py-24 sm:py-28 px-4 sm:px-6 relative border-b border-white/[0.07]"
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.18em] text-[#ff8e8e] mb-4">
            <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
            04 // INSIDE THE WORKSTATION
          </div>
          <h2 className="font-display text-display-section font-bold text-white max-w-[22ch]">
            Precision tools for every stage of the session
          </h2>
        </div>

        <div className="space-y-20 lg:space-y-24">
          {studioFeatures.map((feature, index) => {
            const Icon = feature.icon;
            const isEven = index % 2 === 1;

            return (
              <div
                key={feature.title}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
              >
                {/* Text Content */}
                <div
                  className={`lg:col-span-6 ${isEven ? 'lg:order-2' : 'lg:order-1'} motion-reveal ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 140}ms` }}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl gradient-coral text-black">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono-tech text-xs uppercase tracking-[0.16em] text-white/50">
                      {feature.id} / 03 · {feature.tag}
                    </span>
                  </div>

                  <h3 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-white/60 text-base sm:text-lg leading-relaxed max-w-[54ch] mb-6">
                    {feature.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {feature.specs.map((spec) => (
                      <span
                        key={spec}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono-tech text-[11px] text-white/70"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Studio Artifact Card */}
                <div
                  className={`lg:col-span-6 ${isEven ? 'lg:order-1' : 'lg:order-2'} motion-reveal ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${80 + index * 140}ms` }}
                >
                  <StudioArtifact kind={feature.artifact} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
