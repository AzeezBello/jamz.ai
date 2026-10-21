import { useEffect, useMemo, useRef, useState } from 'react';
import { Music, Radio } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import SongCard from '@/components/SongCard';
import { useLibraryStore } from '@/store/libraryStore';

type ShowcaseFilter = 'all' | 'vocal' | 'instrumental' | 'popular';

const FILTERS: { id: ShowcaseFilter; label: string }[] = [
  { id: 'all', label: 'All Pressings' },
  { id: 'vocal', label: 'Vocal Leads' },
  { id: 'instrumental', label: 'Instrumental' },
  { id: 'popular', label: 'Top Played' },
];

export default function SongShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [filter, setFilter] = useState<ShowcaseFilter>('all');

  const songs = useLibraryStore((s) => s.publicSongs);
  const loading = useLibraryStore((s) => s.loadingPublic);
  const loadPublicSongs = useLibraryStore((s) => s.loadPublicSongs);

  useEffect(() => {
    void loadPublicSongs();
  }, [loadPublicSongs]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const filteredSongs = useMemo(() => {
    const base = [...songs];
    if (filter === 'vocal') return base.filter((s) => !s.is_instrumental);
    if (filter === 'instrumental') return base.filter((s) => s.is_instrumental);
    if (filter === 'popular') return base.sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
    return base;
  }, [songs, filter]);

  return (
    <section
      ref={sectionRef}
      id="discover"
      className="py-24 sm:py-28 px-4 sm:px-6 relative border-b border-white/[0.07]"
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Asymmetric Split Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end mb-14">
          <div
            className={`lg:col-span-7 motion-reveal ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="inline-flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.18em] text-[#ff8e8e] mb-4">
              <Radio className="w-3.5 h-3.5" aria-hidden="true" />
              02 // MASTERING &amp; ACOUSTIC FIDELITY
            </div>
            <h2 className="font-display text-display-section font-bold text-white mb-4">
              Mind blowing song quality
            </h2>
            <p className="text-white/60 max-w-[58ch] text-base sm:text-lg leading-relaxed">
              Whether you start from a melody in your head, notebook lyrics, or a late-night mood,
              Jamz renders studio-grade vocals, dynamics, and instrumentation in seconds.
            </p>
          </div>

          <div
            className={`lg:col-span-5 flex flex-col lg:items-end gap-5 motion-reveal ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '120ms' }}
          >
            {/* Telemetry Readout */}
            <div className="studio-surface rounded-xl px-4 py-3 w-full sm:w-auto flex items-center justify-between sm:justify-start gap-6">
              <div>
                <p className="font-mono-tech text-[10px] uppercase tracking-[0.15em] text-white/45">
                  SAMPLE BUS
                </p>
                <p className="font-mono-tech text-sm font-semibold text-white">48 kHz · 24-Bit</p>
              </div>
              <div className="h-6 w-px bg-white/10" aria-hidden="true" />
              <div>
                <p className="font-mono-tech text-[10px] uppercase tracking-[0.15em] text-white/45">
                  DYNAMIC RANGE
                </p>
                <p className="font-mono-tech text-sm font-semibold text-[#ffb168]">-14 LUFS Master</p>
              </div>
            </div>

            {/* Interactive Filter Tabs */}
            <div
              role="group"
              aria-label="Filter showcase tracks"
              className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1"
            >
              {FILTERS.map((item) => {
                const active = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    aria-pressed={active}
                    className={`rounded-lg px-3 py-1.5 font-mono-tech text-xs transition-all ${
                      active
                        ? 'bg-[#ff6b6b] text-black font-semibold'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {loading && !songs.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        ) : filteredSongs.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSongs.slice(0, 12).map((song, index) => (
              <SongCard
                key={song.id}
                song={song}
                queue={filteredSongs}
                className={`motion-reveal ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
                style={{
                  transitionDelay: `${Math.min(200 + index * 70, 900)}ms`,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="studio-surface text-center py-16 rounded-2xl px-6">
            <Music className="w-10 h-10 text-white/25 mx-auto mb-4" aria-hidden="true" />
            <p className="text-white/75 font-medium mb-1">No matching public songs yet</p>
            <p className="text-white/45 text-sm">
              Generate a track and switch its visibility to public to feature it in the showcase.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
