import { useEffect, useRef, useState } from 'react';
import { Heart, Play } from 'lucide-react';

const songs = [
  { id: 1, title: "Bittersweet Gravity", artist: "Wistaria Addict", image: "/images/song-1.jpg", plays: "256K", likes: "6.0K" },
  { id: 2, title: "Everything's Fine", artist: "Staabsworth", image: "/images/song-2.jpg", plays: "384K", likes: "9.6K" },
  { id: 3, title: "goth girl knife fight.", artist: "a.astronaut", image: "/images/song-3.jpg", plays: "257K", likes: "4.6K" },
  { id: 4, title: "Mirror, mirror on the wall", artist: "Vertical Smile", image: "/images/song-4.jpg", plays: "202K", likes: "4.9K" },
  { id: 5, title: "Stuck In My Head", artist: "Kostaboda", image: "/images/song-5.jpg", plays: "99K", likes: "876" },
  { id: 6, title: "Muse", artist: "sonoa", image: "/images/song-6.jpg", plays: "93K", likes: "285" },
  { id: 7, title: "Dilapidated (Cover)", artist: "DeeBeetttZZ", image: "/images/song-7.jpg", plays: "332K", likes: "4.0K" },
  { id: 8, title: "Parental Burnout", artist: "THE BEAT BASTARDS", image: "/images/song-8.jpg", plays: "85K", likes: "798" },
  { id: 9, title: "I am in - I am out EDM", artist: "EUMAK4U", image: "/images/song-1.jpg", plays: "105K", likes: "1.1K" },
];

export default function SongShowcase() {
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
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-6 relative">
      <div className="max-w-[1400px] mx-auto">
        {/* Section Header */}
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
            Whether you have a melody in your head, lyrics you've written, or just a feeling you want to hear—Jamz makes high-quality music creation accessible to all
          </p>
        </div>

        {/* Songs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {songs.map((song, index) => (
            <div
              key={song.id}
              className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
              }`}
              style={{
                transitionTimingFunction: 'var(--ease-out-expo)',
                transitionDelay: `${500 + index * 100}ms`,
              }}
            >
              {/* Card Background */}
              <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-colors">
                {/* Image */}
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={song.image}
                    alt={song.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  
                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button className="w-14 h-14 rounded-full gradient-coral flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 hover:scale-110">
                      <Play className="w-6 h-6 text-black ml-1" fill="currentColor" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-white font-semibold text-base truncate mb-1">{song.title}</h3>
                  <p className="text-white/50 text-sm mb-3">{song.artist}</p>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-xs">{song.plays}</span>
                    <button className="flex items-center gap-1.5 text-white/40 hover:text-[#ff6b6b] transition-colors text-xs group/like">
                      <Heart className="w-3.5 h-3.5 group-hover/like:scale-110 transition-transform" />
                      <span>{song.likes}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
