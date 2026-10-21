import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Activity, AudioWaveform, Dice5, Disc3, Loader2, Sliders, Sparkles } from 'lucide-react';
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

const SEED_PRESETS = [
  {
    tag: 'COUNTRY · 96 BPM',
    prompt: 'Make a country song about Jess being late',
  },
  {
    tag: 'SYNTH POP · 122 BPM',
    prompt: 'Create an upbeat pop song about summer love',
  },
  {
    tag: 'DARK ELECTRO · 130 BPM',
    prompt: 'Generate a dark electronic track for a workout',
  },
  {
    tag: 'LO-FI TAPE · 84 BPM',
    prompt: 'Make a lo-fi hip hop beat for studying',
  },
];

const PRESS_ACCLAIM = [
  { outlet: 'WIRED', quote: 'Studio-grade stems from a single line of text.' },
  { outlet: 'BILLBOARD', quote: 'A pocket session band that never sleeps.' },
  { outlet: 'ROLLING STONE', quote: 'Uncanny vocal warmth and arrangement depth.' },
  { outlet: 'THE VERGE', quote: 'Bridges bedroom ideas and DAW-ready masters.' },
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
      }, 260);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

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
      { x: 0.22, y: 0.24, radius: 0.42, color: 'rgba(255, 107, 107, 0.28)', speed: 0.00028 },
      { x: 0.78, y: 0.26, radius: 0.36, color: 'rgba(255, 177, 104, 0.18)', speed: 0.00035 },
      { x: 0.5, y: 0.58, radius: 0.46, color: 'rgba(255, 107, 107, 0.16)', speed: 0.00022 },
    ];

    const draw = () => {
      ctx.fillStyle = '#070709';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const blob of blobs) {
        const x = canvas.width * (blob.x + Math.sin(time * blob.speed) * 0.08);
        const y = canvas.height * (blob.y + Math.cos(time * blob.speed * 0.7) * 0.08);
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
    <section className="relative min-h-dvh flex flex-col justify-center overflow-hidden pt-24 sm:pt-28 pb-16 sm:pb-20 studio-grid-bg border-b border-white/[0.07]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ opacity: 0.85 }}
        aria-hidden="true"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#070709] to-transparent z-[1]"
      />

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-4 sm:px-6">
        {/* Top Studio Telemetry Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 pb-6 sm:pb-8 mb-6 sm:mb-8 border-b border-white/[0.08]">
          <div className="inline-flex items-center gap-2 sm:gap-2.5 rounded-full border border-white/12 bg-white/[0.03] px-3 sm:px-3.5 py-1.5 max-w-full">
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6b6b] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6b6b]" />
            </span>
            <span className="font-mono-tech text-[10px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.18em] text-white/80 truncate">
              01 // JAMZ NEURAL AUDIO ENGINE · v5 MAX
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-6 font-mono-tech text-[11px] uppercase tracking-[0.14em] text-white/45">
            <span className="inline-flex items-center gap-1.5">
              <AudioWaveform className="w-3.5 h-3.5 text-[#ff6b6b]" aria-hidden="true" />
              48.0 kHz / 24-BIT STEREO
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Disc3 className="w-3.5 h-3.5 text-[#ffb168]" aria-hidden="true" />
              12-STEM SEPARATION
            </span>
          </div>
        </div>

        {/* Asymmetric Split Hero Header + Studio Console */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-14 sm:mb-16">
          {/* Left Column: Editorial Display Statement */}
          <div className="lg:col-span-7 text-left">
            <h1 className="font-display text-display-hero font-extrabold text-white tracking-tight mb-5 sm:mb-6">
              <span className="block">Make any</span>
              <span className="inline-flex items-baseline gap-3 my-1">
                <span className="inline-block rounded-2xl border border-[#ff6b6b]/35 bg-[#ff6b6b]/[0.08] px-3 sm:px-4 py-1 text-gradient">
                  <span
                    className={`inline-block transition-all duration-300 ${
                      swapping ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
                    }`}
                  >
                    {ROTATING_WORDS[wordIndex]}
                  </span>
                </span>
              </span>
              <span className="block text-white/95">you can imagine.</span>
            </h1>

            <p className="text-white/65 max-w-[54ch] text-base sm:text-lg leading-relaxed mb-7 sm:mb-8">
              Start with a plain-English brief or shape arrangements with multi-track stem controls,
              vocal timbre steering, and time-aligned WAV exports.
            </p>

            {/* Quick Studio Specs Strip */}
            <dl className="grid grid-cols-3 gap-2 sm:gap-4 max-w-lg pt-5 sm:pt-6 border-t border-white/[0.08]">
              <div>
                <dt className="font-mono-tech text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.16em] text-white/45">
                  DAILY ALLOWANCE
                </dt>
                <dd className="font-mono-tech text-sm sm:text-xl font-semibold text-white mt-0.5">
                  10 Free Songs
                </dd>
              </div>
              <div>
                <dt className="font-mono-tech text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.16em] text-white/45">
                  FIRST TAKE
                </dt>
                <dd className="font-mono-tech text-sm sm:text-xl font-semibold text-white mt-0.5">
                  &lt; 12 Seconds
                </dd>
              </div>
              <div>
                <dt className="font-mono-tech text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.16em] text-white/45">
                  DAW EXPORT
                </dt>
                <dd className="font-mono-tech text-sm sm:text-xl font-semibold text-[#ffb168] mt-0.5">
                  12 WAV Stems
                </dd>
              </div>
            </dl>
          </div>

          {/* Right Column: Tactile Studio Command Console */}
          <div className="lg:col-span-5 w-full">
            <div className="studio-surface rounded-2xl p-4 sm:p-5">
              {/* Console Header */}
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#ff6b6b]" aria-hidden="true" />
                  <span className="font-mono-tech text-[11px] uppercase tracking-[0.15em] text-white/70">
                    STUDIO PROMPT DECK
                  </span>
                </div>
                <span className="font-mono-tech text-[10px] uppercase tracking-[0.14em] rounded bg-white/[0.06] border border-white/10 px-2 py-0.5 text-white/60">
                  {instrumental ? 'INSTRUMENTAL BUS' : 'FULL VOCAL + BAND'}
                </span>
              </div>

              {/* Prompt Input Well */}
              <div className="studio-well rounded-xl p-2.5 focus-within:border-[#ff6b6b]/60 transition-colors">
                <label htmlFor="prompt" className="sr-only">
                  Describe the song you want
                </label>
                <input
                  id="prompt"
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Make a country song about Jess being late"
                  className="w-full bg-transparent text-white placeholder-white/40 px-2.5 py-2.5 outline-none text-sm sm:text-base"
                  onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
                />

                {/* Console Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-1 border-t border-white/[0.07]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((open) => !open)}
                      aria-expanded={showAdvanced}
                      aria-controls="advanced-panel"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono-tech text-xs transition-colors border ${
                        showAdvanced
                          ? 'text-white bg-white/12 border-white/25'
                          : 'text-white/65 border-white/10 hover:text-white hover:bg-white/[0.07]'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Advanced</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPrompt(PROMPT_IDEAS[Math.floor(Math.random() * PROMPT_IDEAS.length)])
                      }
                      aria-label="Use a random prompt idea"
                      className="p-2 hover:bg-white/10 rounded-lg border border-white/10 text-white/65 hover:text-white transition-colors"
                    >
                      <Dice5 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <Button
                    onClick={() => void handleCreate()}
                    disabled={submitting || initializing}
                    className="gradient-coral text-black font-semibold px-5 py-2 rounded-xl hover:opacity-95 transition-all flex items-center gap-2 shadow-[0_8px_24px_-6px_rgba(255,107,107,0.55)]"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                    )}
                    Create
                  </Button>
                </div>
              </div>

              {/* Expandable Studio Parameters Bay */}
              {showAdvanced && (
                <div
                  id="advanced-panel"
                  className="studio-well rounded-xl mt-3 p-4 space-y-4 text-left border border-white/10"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="style" className="text-white/75 text-xs font-mono-tech uppercase tracking-wider">
                      Style and instruments
                    </Label>
                    <Input
                      id="style"
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      placeholder="dream pop, warm analog synths, brushed drums"
                      className="bg-white/[0.04] border-white/15 text-white placeholder:text-white/35 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="length" className="text-white/75 text-xs font-mono-tech uppercase tracking-wider">
                        Length
                      </Label>
                      <span className="font-mono-tech text-white/70 text-xs tabular-nums">
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

                  <div className="flex items-center justify-between pt-1">
                    <Label htmlFor="instrumental" className="text-white/75 text-xs font-mono-tech uppercase tracking-wider">
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
                    <p className="font-mono-tech text-white/50 text-[11px] pt-2 border-t border-white/[0.07]">
                      Costs {GENERATION_COST} credits · Balance: {profile?.credit_balance ?? 0}
                      {!affordable && (
                        <span className="text-[#ff6b6b]"> (top up required for next take)</span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Seed Presets */}
              <div className="mt-4 pt-3.5 border-t border-white/[0.07]">
                <p className="font-mono-tech text-[10px] uppercase tracking-[0.16em] text-white/40 mb-2.5">
                  QUICK SESSION SEEDS
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SEED_PRESETS.map((seed) => (
                    <button
                      key={seed.prompt}
                      type="button"
                      onClick={() => setPrompt(seed.prompt)}
                      className="group text-left rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 px-3 py-2 transition-all"
                    >
                      <span className="block font-mono-tech text-[10px] tracking-[0.12em] text-[#ff8e8e]">
                        {seed.tag}
                      </span>
                      <span className="block text-xs text-white/70 group-hover:text-white truncate mt-0.5">
                        {seed.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Community Pressings Shelf */}
        {publicSongs.length > 0 && (
          <div className="mb-14">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-white/50">
                RECENT STUDIO PRESSINGS // LIVE STREAM
              </span>
              <span className="font-mono-tech text-[11px] text-white/40">
                01 / 0{Math.min(publicSongs.length, 4)}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {publicSongs.slice(0, 4).map((song) => (
                <SongCard key={song.id} song={song} queue={publicSongs} aspect="portrait" />
              ))}
            </div>
          </div>
        )}

        {/* Editorial Press Ledger */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t border-white/[0.08]">
          {PRESS_ACCLAIM.map((item) => (
            <div
              key={item.outlet}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5"
            >
              <p className="font-mono-tech text-xs font-semibold tracking-[0.18em] text-white/75 mb-1">
                {item.outlet}
              </p>
              <p className="text-xs text-white/50 leading-relaxed">&ldquo;{item.quote}&rdquo;</p>
            </div>
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
