import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sliders, Sparkles, Plus, Dice5 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import GenerationModal from '@/components/modals/GenerationModal';
import AuthModal from '@/components/modals/AuthModal';

const rotatingWords = ['song', 'sound', 'beat', 'track', 'tune'];

const songCards = [
  { id: 1, title: "Bittersweet Gravity", artist: "Wistaria Addict", image: "/images/song-1.jpg", plays: "256K", likes: "6.0K" },
  { id: 2, title: "Everything's Fine", artist: "Staabsworth", image: "/images/song-2.jpg", plays: "384K", likes: "9.6K" },
  { id: 3, title: "goth girl knife fight.", artist: "a.astronaut", image: "/images/song-3.jpg", plays: "257K", likes: "4.6K" },
  { id: 4, title: "Mirror, mirror on the wall", artist: "Vertical Smile", image: "/images/song-4.jpg", plays: "202K", likes: "4.9K" },
];

const promptIdeas = [
  "Make a country song about Jess being late",
  "Create an upbeat pop song about summer love",
  "Generate a dark electronic track for a workout",
  "Make a lo-fi hip hop beat for studying",
  "Create a romantic ballad about stargazing",
  "Generate an energetic EDM drop",
];

export default function Hero() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { isAuthenticated, startGeneration, playSong, songs, likeSong } = useStore();

  // Word rotation animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Animated gradient background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const blobs = [
      { x: 0.3, y: 0.2, radius: 0.4, color: 'rgba(255, 107, 107, 0.5)', speed: 0.0003 },
      { x: 0.7, y: 0.3, radius: 0.35, color: 'rgba(255, 142, 142, 0.4)', speed: 0.0004 },
      { x: 0.5, y: 0.5, radius: 0.5, color: 'rgba(255, 71, 87, 0.3)', speed: 0.0002 },
      { x: 0.2, y: 0.6, radius: 0.3, color: 'rgba(200, 50, 50, 0.25)', speed: 0.0005 },
    ];

    const animate = () => {
      time += 1;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobs.forEach((blob) => {
        const x = canvas.width * (blob.x + Math.sin(time * blob.speed) * 0.1);
        const y = canvas.height * (blob.y + Math.cos(time * blob.speed * 0.7) * 0.1);
        const radius = Math.min(canvas.width, canvas.height) * blob.radius;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleCreate = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    
    if (!inputValue.trim()) {
      // Use a random prompt if empty
      setInputValue(promptIdeas[Math.floor(Math.random() * promptIdeas.length)]);
      return;
    }
    
    setShowGenerationModal(true);
    const song = await startGeneration(inputValue);
    setShowGenerationModal(false);
    
    if (song) {
      playSong(song);
      setInputValue('');
    }
  };

  const handleRandomPrompt = () => {
    const randomPrompt = promptIdeas[Math.floor(Math.random() * promptIdeas.length)];
    setInputValue(randomPrompt);
  };

  const handlePlayFeatured = (songId: number) => {
    const song = songs.find(s => s.id === songId.toString());
    if (song) {
      playSong(song);
    }
  };

  const handleLikeFeatured = (e: React.MouseEvent, songId: number) => {
    e.stopPropagation();
    likeSong(songId.toString());
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
      {/* Animated gradient canvas background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ opacity: 0.8 }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 flex flex-col items-center">
        {/* Main Title with word rotation */}
        <div className="text-center mb-6">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight">
            <span
              className="inline-block"
              style={{ animation: 'fade-slide-up 0.8s var(--ease-out-expo) 0.3s forwards', opacity: 0 }}
            >
              Make any{' '}
            </span>
            <span
              className="inline-block text-gradient relative"
              style={{ animation: 'fade-slide-up 0.8s var(--ease-out-expo) 0.5s forwards', opacity: 0 }}
            >
              <span
                className={`inline-block transition-all duration-300 ${
                  isAnimating ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
                }`}
              >
                {rotatingWords[currentWordIndex]}
              </span>
            </span>
          </h1>
          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight"
            style={{ animation: 'fade-slide-up 0.8s var(--ease-out-expo) 0.7s forwards', opacity: 0 }}
          >
            you can imagine
          </h1>
        </div>

        {/* Subtitle */}
        <p
          className="text-white/60 text-center max-w-xl mb-10 text-base md:text-lg"
          style={{ animation: 'fade-slide-up 0.6s var(--ease-out-expo) 0.9s forwards', opacity: 0 }}
        >
          Start with a simple prompt or dive into our pro editing tools, your next track is just a step away.
        </p>

        {/* Input Container */}
        <div
          className="w-full max-w-2xl mb-16"
          style={{ animation: 'scale-in 0.7s var(--ease-elastic) 1.1s forwards', opacity: 0 }}
        >
          <div className="glass rounded-2xl p-2 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Make a country song about Jess being late"
              className="flex-1 bg-transparent text-white placeholder-white/40 px-4 py-3 outline-none text-sm md:text-base"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Plus className="w-5 h-5 text-white/60" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm">
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">Advanced</span>
            </button>
            <button 
              onClick={handleRandomPrompt}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Dice5 className="w-5 h-5 text-white/60" />
            </button>
            <Button 
              onClick={handleCreate}
              className="gradient-coral text-black font-semibold px-6 py-2 rounded-xl hover:opacity-90 transition-all hover:scale-105 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Create
            </Button>
          </div>
          
          {/* Quick Prompts */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {promptIdeas.slice(0, 4).map((prompt, index) => (
              <button
                key={index}
                onClick={() => setInputValue(prompt)}
                className="text-xs text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
              >
                {prompt.length > 35 ? prompt.slice(0, 35) + '...' : prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Song Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl mb-16">
          {songCards.map((song, index) => (
            <div
              key={song.id}
              onClick={() => handlePlayFeatured(song.id)}
              className="group relative rounded-xl overflow-hidden cursor-pointer card-lift"
              style={{
                animation: `slide-in-left 0.8s var(--ease-out-expo) ${1.3 + index * 0.15}s forwards`,
                opacity: 0,
              }}
            >
              <div className="aspect-[3/4] relative">
                <img
                  src={song.image}
                  alt={song.title}
                  className="w-full h-full object-cover"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full gradient-coral flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300">
                    <svg className="w-5 h-5 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                {/* Song info */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold text-sm truncate">{song.title}</h3>
                  <p className="text-white/60 text-xs">{song.artist}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/50">
                    <span>{song.plays}</span>
                    <button 
                      onClick={(e) => handleLikeFeatured(e, song.id)}
                      className="flex items-center gap-1 hover:text-[#ff6b6b] transition-colors"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      {song.likes}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Media Logos */}
        <div
          className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-40"
          style={{ animation: 'fade-slide-up 0.4s var(--ease-smooth) 1.7s forwards', opacity: 0 }}
        >
          {['WIRED', 'billboard', 'COMPLEX', 'Forbes', 'RollingStone', 'Variety'].map((logo) => (
            <span key={logo} className="text-white text-sm md:text-base font-semibold tracking-wider">
              {logo}
            </span>
          ))}
        </div>
      </div>

      {/* Modals */}
      <GenerationModal 
        isOpen={showGenerationModal} 
        onClose={() => setShowGenerationModal(false)} 
      />
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        defaultTab="signup"
      />
    </section>
  );
}
