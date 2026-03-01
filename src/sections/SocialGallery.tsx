import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Play } from 'lucide-react';

const socialPosts = [
  { id: 1, handle: "@timbaland", plays: "7.5K", likes: "892", image: "/images/song-1.jpg" },
  { id: 2, handle: "@spellspellspell", plays: "3.4K", likes: "567", image: "/images/song-2.jpg" },
  { id: 3, handle: "@nickfloats", plays: "9.9K", likes: "234", image: "/images/song-3.jpg", collab: "@milesmusickid" },
  { id: 4, handle: "@devanibiza", plays: "6.8K", likes: "345", image: "/images/song-4.jpg" },
  { id: 5, handle: "@techguyver", plays: "4.6K", likes: "678", image: "/images/song-5.jpg" },
];

export default function SocialGallery() {
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
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="discover" className="py-24 px-6 relative">
      <div className="max-w-[1400px] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2
            className={`text-4xl md:text-5xl font-bold text-white mb-4 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
          >
            Explore and get inspired
          </h2>
          <p
            className={`text-white/60 text-lg max-w-xl mx-auto transition-all duration-700 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
          >
            Join the #1 AI music generator. Create songs, remix tracks, make beats, and share your music with millions — free forever.
          </p>
        </div>

        {/* Social Posts Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          {socialPosts.map((post, index) => (
            <div
              key={post.id}
              className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] ${
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}
              style={{
                transitionTimingFunction: 'var(--ease-out-expo)',
                transitionDelay: `${400 + index * 100}ms`,
              }}
            >
              {/* Image */}
              <div className="aspect-square relative">
                <img
                  src={post.image}
                  alt={`Post by ${post.handle}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="w-12 h-12 rounded-full gradient-coral flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300">
                    <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
                  </button>
                </div>

                {/* Info */}
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-white text-sm font-medium">{post.handle}</p>
                  {post.collab && (
                    <p className="text-white/60 text-xs">{post.collab}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
                    <span>{post.plays}</span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {post.likes}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className={`text-center transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
          style={{ transitionTimingFunction: 'var(--ease-out-expo)', transitionDelay: '1000ms' }}
        >
          <Button className="gradient-coral text-black font-semibold px-8 py-3 rounded-full hover:opacity-90 transition-opacity text-lg">
            Sign up for free
          </Button>
        </div>
      </div>
    </section>
  );
}
