import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Disc3, Heart, Play, Sparkles } from 'lucide-react';
import AuthModal from '@/components/modals/AuthModal';
import { useAuthStore } from '@/store/authStore';

const socialPosts = [
  {
    id: 1,
    handle: '@timbaland',
    genre: 'FUTURE BEAT · 138 BPM',
    plays: '7.5K',
    likes: '892',
    image: '/images/song-1.jpg',
  },
  {
    id: 2,
    handle: '@spellspellspell',
    genre: 'ALT SYNTH · 114 BPM',
    plays: '3.4K',
    likes: '567',
    image: '/images/song-2.jpg',
  },
  {
    id: 3,
    handle: '@nickfloats',
    genre: 'INDIE SOUL · 98 BPM',
    plays: '9.9K',
    likes: '234',
    image: '/images/song-3.jpg',
    collab: '@milesmusickid',
  },
  {
    id: 4,
    handle: '@devanibiza',
    genre: 'BALEARIC HOUSE · 124 BPM',
    plays: '6.8K',
    likes: '345',
    image: '/images/song-4.jpg',
  },
  {
    id: 5,
    handle: '@techguyver',
    genre: 'MODULAR AMBIENT · 86 BPM',
    plays: '4.6K',
    likes: '678',
    image: '/images/song-5.jpg',
  },
];

export default function SocialGallery() {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const session = useAuthStore((s) => s.session);

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

  const handlePrimaryCta = () => {
    if (session) {
      navigate('/create');
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <section ref={sectionRef} id="community" className="py-20 sm:py-28 px-4 sm:px-6 relative">
      <div className="max-w-[1400px] mx-auto">
        {/* Asymmetric Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
          <div
            className={`motion-reveal ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="inline-flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.18em] text-[#ff8e8e] mb-4">
              <Disc3 className="w-3.5 h-3.5" aria-hidden="true" />
              07 // COMMUNITY PRESSINGS WALL
            </div>
            <h2 className="font-display text-display-section font-bold text-white">
              Explore and get inspired
            </h2>
          </div>
          <p
            className={`text-white/60 text-base sm:text-lg max-w-[48ch] motion-reveal ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            Join creators pressing original songs, remixes, and late-night beats across every genre.
            Start free with 50 daily credits.
          </p>
        </div>

        {/* Social Posts Wall */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-14">
          {socialPosts.map((post, index) => (
            <article
              key={post.id}
              className={`group studio-surface card-lift rounded-2xl overflow-hidden flex flex-col motion-reveal ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{
                transitionDelay: `${160 + index * 80}ms`,
              }}
            >
              <div className="aspect-square relative overflow-hidden bg-black">
                <img
                  src={post.image}
                  alt={`Featured track artwork by ${post.handle}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

                <span className="absolute top-3 left-3 rounded-md bg-black/70 backdrop-blur-md border border-white/15 px-2 py-0.5 font-mono-tech text-[10px] text-white/80">
                  {post.genre}
                </span>

                <button
                  type="button"
                  onClick={() => navigate('/dashboard?tab=discover')}
                  aria-label={`Explore tracks like ${post.handle}`}
                  className="absolute bottom-3 right-3 w-10 h-10 rounded-full gradient-coral flex items-center justify-center text-black shadow-lg transition-transform duration-300 group-hover:scale-105"
                >
                  <Play className="w-4 h-4 ml-0.5" fill="currentColor" aria-hidden="true" />
                </button>
              </div>

              <div className="p-3.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{post.handle}</p>
                  <p className="font-mono-tech text-[11px] text-white/45 truncate">
                    {post.collab ? `ft. ${post.collab}` : 'Original Studio Pressing'}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 font-mono-tech text-[11px] text-white/60">
                  <span>{post.plays}</span>
                  <span className="inline-flex items-center gap-1 text-[#ff8e8e]">
                    <Heart className="w-3 h-3" aria-hidden="true" />
                    {post.likes}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Studio Closing CTA Banner */}
        <div
          className={`studio-surface rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 motion-reveal ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
          style={{ transitionDelay: '450ms' }}
        >
          <div>
            <p className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-[#ffb168] mb-2">
              READY TO ROLL TAPE?
            </p>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mb-1.5">
              Your first 10 songs today are on the house.
            </h3>
            <p className="text-white/60 text-sm sm:text-base max-w-[52ch]">
              Open the browser workstation, type a prompt or paste your lyrics, and hear a finished
              master in under 15 seconds.
            </p>
          </div>

          <Button
            onClick={handlePrimaryCta}
            className="gradient-coral text-black font-semibold px-7 py-5 rounded-xl hover:opacity-90 transition-opacity text-base shrink-0 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {session ? 'Open Create Studio' : 'Sign up for free'}
          </Button>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab="signup"
      />
    </section>
  );
}
