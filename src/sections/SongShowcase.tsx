import { useEffect, useRef, useState } from 'react';
import { Music } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import SongCard from '@/components/SongCard';
import { useLibraryStore } from '@/store/libraryStore';

export default function SongShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // One source of truth: the same public feed the hero and dashboard read.
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
      { threshold: 0.2 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="discover" className="py-24 px-6 relative">
      <div className="max-w-[1400px] mx-auto">
        <div className="text-center mb-16">
          <h2
            className={`text-4xl md:text-5xl font-bold text-white mb-6 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
          >
            Mind blowing song quality
          </h2>
          <p
            className={`text-white/60 max-w-2xl mx-auto text-base md:text-lg transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
          >
            Whether you have a melody in your head, lyrics you've written, or just a feeling you
            want to hear—Jamz makes high-quality music creation accessible to all
          </p>
        </div>

        {loading && !songs.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl bg-white/5" />
            ))}
          </div>
        ) : songs.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {songs.slice(0, 12).map((song, index) => (
              <SongCard
                key={song.id}
                song={song}
                queue={songs}
                className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
                style={{
                  transitionTimingFunction: 'var(--ease-out-expo)',
                  transitionDelay: `${Math.min(500 + index * 100, 1500)}ms`,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-white/10 rounded-2xl bg-white/5">
            <Music className="w-10 h-10 text-white/20 mx-auto mb-4" aria-hidden="true" />
            <p className="text-white/60 mb-1">No public songs yet</p>
            <p className="text-white/40 text-sm">
              Make one and set it to public — it will show up right here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
