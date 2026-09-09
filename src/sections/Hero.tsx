import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Dice5, Loader2, Sliders, Sparkles } from 'lucide-react';
import AuthModal from '@/components/modals/AuthModal';
import SongCard from '@/components/SongCard';
import { useAuthStore } from '@/store/authStore';
import { useGenerationStore } from '@/store/generationStore';
import { useLibraryStore } from '@/store/libraryStore';
import { formatDuration } from '@/lib/format';
import { GENERATION_COST, canAfford } from '@/lib/credits';

const ROTATING_WORDS = ['song', 'sound', 'beat', 'track', 'tune'];

const PROMPT_IDEAS = [
  'Make a country song about Jess being late',
  'Create an upbeat pop song about summer love',
  'Generate a dark electronic track for a workout',
  'Make a lo-fi hip hop beat for studying',
  'Create a romantic ballad about stargazing',
  'Generate an energetic EDM drop',
];

export default function Hero() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [wordIndex, setWordIndex] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [style, setStyle] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [seconds, setSeconds] = useState(45);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const session = useAuthStore((s) => s.session);
  const initializing = useAuthStore((s) => s.initializing);
  const profile = useAuthStore((s) => s.profile);
  const { start, submitting } = useGenerationStore();
  const publicSongs = useLibraryStore((s) => s.publicSongs);
  const loadPublicSongs = useLibraryStore((s) => s.loadPublicSongs);

  useEffect(() => {
    void loadPublicSongs();
  }, [loadPublicSongs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSwapping(true);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
        setSwapping(false);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Respect a reduced-motion preference instead of animating regardless.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationId = 0;
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

    const draw = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const blob of blobs) {
        const x = canvas.width * (blob.x + Math.sin(time * blob.speed) * 0.1);
        const y = canvas.height * (blob.y + Math.cos(time * blob.speed * 0.7) * 0.1);
        const radius = Math.min(canvas.width, canvas.height) * blob.radius;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    const animate = () => {
      time += 1;
      draw();
      animationId = requestAnimationFrame(animate);
    };

    if (reduceMotion) draw();
    else animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleCreate = async () => {
    // On a fresh page load the session is null until getSession() resolves.
    // Acting on that would show the sign-in dialog to someone who is already
    // signed in, so wait for auth to settle before deciding.
    if (initializing) return;

    if (!session) {
      setShowAuthModal(true);
      return;
    }

    const trimmed = prompt.trim();
    if (trimmed.length < 3) {
      toast.error('Describe the song you want in a few words.');
      return;
    }

    const job = await start({ prompt: trimmed, style: style.trim(), instrumental, seconds });
    if (!job) {
      // start() records the reason; surface it and point at the fix.
      const error = useGenerationStore.getState().error ?? 'Could not start generation.';
      toast.error(error, {
        action: /credit/i.test(error)
          ? { label: 'Get credits', onClick: () => navigate('/billing') }
          : undefined,
      });
      return;
    }
    setPrompt('');
  };

  const affordable = canAfford(profile?.credit_balance ?? 0);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ opacity: 0.8 }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 flex flex-col items-center">
        <div className="text-center mb-6">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight">
            <span
              className="inline-block"
              style={{
                animation: 'fade-slide-up 0.8s var(--ease-out-expo) 0.3s forwards',
                opacity: 0,
              }}
            >
              Make any{' '}
            </span>
            <span
              className="inline-block text-gradient relative"
              style={{
                animation: 'fade-slide-up 0.8s var(--ease-out-expo) 0.5s forwards',
                opacity: 0,
              }}
            >
              <span
                className={`inline-block transition-all duration-300 ${swapping ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
              >
                {ROTATING_WORDS[wordIndex]}
              </span>
            </span>
          </h1>
          <span
            className="block text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight"
            style={{
              animation: 'fade-slide-up 0.8s var(--ease-out-expo) 0.7s forwards',
              opacity: 0,
            }}
          >
            you can imagine
          </span>
        </div>

        <p
          className="text-white/60 text-center max-w-xl mb-10 text-base md:text-lg"
          style={{ animation: 'fade-slide-up 0.6s var(--ease-out-expo) 0.9s forwards', opacity: 0 }}
        >
          Start with a simple prompt or dive into our pro editing tools, your next track is just a
          step away.
        </p>

        <div
          className="w-full max-w-2xl mb-16"
          style={{ animation: 'scale-in 0.7s var(--ease-elastic) 1.1s forwards', opacity: 0 }}
        >
          <div className="glass rounded-2xl p-2 flex items-center gap-2">
            <label htmlFor="prompt" className="sr-only">
              Describe the song you want
            </label>
            <input
              id="prompt"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Make a country song about Jess being late"
              className="flex-1 bg-transparent text-white placeholder-white/40 px-4 py-3 outline-none text-sm md:text-base"
              onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
            />

            <button
              type="button"
              onClick={() => setShowAdvanced((open) => !open)}
              aria-expanded={showAdvanced}
              aria-controls="advanced-panel"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                showAdvanced
                  ? 'text-white bg-white/10'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sliders className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Advanced</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setPrompt(PROMPT_IDEAS[Math.floor(Math.random() * PROMPT_IDEAS.length)])
              }
              aria-label="Use a random prompt idea"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Dice5 className="w-5 h-5 text-white/60" aria-hidden="true" />
            </button>

            <Button
              onClick={() => void handleCreate()}
              disabled={submitting || initializing}
              className="gradient-coral text-black font-semibold px-6 py-2 rounded-xl hover:opacity-90 transition-all hover:scale-105 flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              )}
              Create
            </Button>
          </div>

          {showAdvanced && (
            <div id="advanced-panel" className="glass rounded-2xl mt-3 p-5 space-y-5 text-left">
              <div className="space-y-2">
                <Label htmlFor="style" className="text-white/70 text-sm">
                  Style and instruments
                </Label>
                <Input
                  id="style"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="dream pop, warm analog synths, brushed drums"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="length" className="text-white/70 text-sm">
                    Length
                  </Label>
                  <span className="text-white/50 text-sm tabular-nums">
                    {formatDuration(seconds)}
                  </span>
                </div>
                <Slider
                  id="length"
                  value={[seconds]}
                  onValueChange={([value]) => setSeconds(value)}
                  min={15}
                  max={180}
                  step={15}
                  aria-label="Song length in seconds"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="instrumental" className="text-white/70 text-sm font-normal">
                  Instrumental only
                </Label>
                <Switch
                  id="instrumental"
                  checked={instrumental}
                  onCheckedChange={setInstrumental}
                  className="data-[state=checked]:bg-[#ff6b6b]"
                />
              </div>

              {session && (
                <p className="text-white/40 text-xs">
                  Costs {GENERATION_COST} credits · you have {profile?.credit_balance ?? 0}
                  {!affordable && (
                    <span className="text-[#ff6b6b]"> — not enough for another song</span>
                  )}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {PROMPT_IDEAS.slice(0, 4).map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setPrompt(idea)}
                className="text-xs text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
              >
                {idea.length > 35 ? `${idea.slice(0, 35)}…` : idea}
              </button>
            ))}
          </div>
        </div>

        {publicSongs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl mb-16">
            {publicSongs.slice(0, 4).map((song, index) => (
              <SongCard
                key={song.id}
                song={song}
                queue={publicSongs}
                aspect="portrait"
                style={{
                  animation: `slide-in-left 0.8s var(--ease-out-expo) ${1.3 + index * 0.15}s forwards`,
                  opacity: 0,
                }}
              />
            ))}
          </div>
        )}

        <div
          className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-40"
          style={{ animation: 'fade-slide-up 0.4s var(--ease-smooth) 1.7s forwards', opacity: 0 }}
        >
          {['WIRED', 'billboard', 'COMPLEX', 'Forbes', 'RollingStone', 'Variety'].map((logo) => (
            <span
              key={logo}
              className="text-white text-sm md:text-base font-semibold tracking-wider"
            >
              {logo}
            </span>
          ))}
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
