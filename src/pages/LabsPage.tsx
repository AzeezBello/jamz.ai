import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  Disc3,
  Dices,
  FlaskConical,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Trophy,
  Volume2,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/store/uiStore';

type ActiveLab = 'overview' | 'genre-wheel' | 'listen-rank' | 'milo-1080';

interface GenreWheelEntry {
  id: string;
  name: string;
  bpm: number;
  keySignature: string;
  description: string;
  stylePrompt: string;
  chordHz: number[];
  color: string;
}

const GENRE_WHEEL_ENTRIES: GenreWheelEntry[] = [
  {
    id: 'lofi-cloud-rap',
    name: 'lo-fi cloud rap',
    bpm: 78,
    keySignature: 'F Minor',
    description: 'Vaporous pads, detuned Rhodes, and booming 808 sub glides.',
    stylePrompt: 'lo-fi cloud rap, ethereal pads, detuned electric piano, deep 808 glides',
    chordHz: [174.61, 207.65, 261.63, 311.13],
    color: '#a855f7',
  },
  {
    id: 'jazz-sertanejo',
    name: 'jazz sertanejo',
    bpm: 104,
    keySignature: 'D Major',
    description: 'Brazilian acoustic viola rhythms fused with smoky late-night jazz chords.',
    stylePrompt: 'jazz sertanejo, acoustic nylon guitar, brushed snare, warm upright bass, brass',
    chordHz: [146.83, 185.0, 220.0, 277.18],
    color: '#f59e0b',
  },
  {
    id: 'chanson-alt-pop',
    name: 'chanson alt-pop',
    bpm: 112,
    keySignature: 'A Minor',
    description: 'Cinematic French storytelling paired with modern indie synth production.',
    stylePrompt: 'chanson alt-pop, expressive vocals, accordion textures, driving analog synth bass',
    chordHz: [220.0, 261.63, 329.63, 392.0],
    color: '#ec4899',
  },
  {
    id: 'classical-surf',
    name: 'classical surf',
    bpm: 138,
    keySignature: 'E Minor',
    description: 'Baroque counterpoint played on spring-reverb drenched surf guitars.',
    stylePrompt: 'classical surf rock, spring reverb tremolo guitar, orchestral strings, driving drums',
    chordHz: [164.81, 196.0, 246.94, 329.63],
    color: '#38bdf8',
  },
  {
    id: 'sitar-fife-blues',
    name: 'sitar fife and drum blues',
    bpm: 96,
    keySignature: 'G Minor',
    description: 'Resonant sympathetic sitar strings over hypnotic fife and marching blues.',
    stylePrompt: 'sitar fife and drum blues, resonant sitar, raw marching snare, gritty blues groove',
    chordHz: [196.0, 233.08, 293.66, 349.23],
    color: '#f97316',
  },
  {
    id: 'french-psybient',
    name: 'french psybient',
    bpm: 90,
    keySignature: 'C Minor',
    description: 'Hypnotic binaural arpeggios, dub basslines, and vocoder textures.',
    stylePrompt: 'french psybient, binaural modular arpeggios, deep dub bass, vocoder harmonies',
    chordHz: [130.81, 155.56, 196.0, 233.08],
    color: '#14b8a6',
  },
  {
    id: 'techno-norteno',
    name: 'techno norteño',
    bpm: 128,
    keySignature: 'B Minor',
    description: 'Industrial 909 warehouse kicks locking in with Polka-inflected bajo sexto.',
    stylePrompt: 'techno norteño, 909 techno kick, accordion lead, bajo sexto rhythm, acid synth',
    chordHz: [246.94, 293.66, 369.99, 440.0],
    color: '#10b981',
  },
  {
    id: 'jazz-future-bass',
    name: 'jazz future bass',
    bpm: 145,
    keySignature: 'Eb Major',
    description: 'Extended 9th and 13th supersaw chords with virtuosic sax runs.',
    stylePrompt: 'jazz future bass, lush detuned supersaw 9th chords, alto saxophone solo, snappy trap drums',
    chordHz: [155.56, 196.0, 233.08, 293.66],
    color: '#ff6b6b',
  },
  {
    id: 'lofi-bubblegum-bass',
    name: 'lo-fi bubblegum bass',
    bpm: 132,
    keySignature: 'A Major',
    description: 'Hyper-kinetic pitch-shifted percussion softened by tape saturation.',
    stylePrompt: 'lo-fi bubblegum bass, bouncy synth plucks, tape warmth, glossy vocal chops',
    chordHz: [220.0, 277.18, 329.63, 415.3],
    color: '#f472b6',
  },
  {
    id: 'havana-cajun',
    name: 'havana cajun',
    bpm: 118,
    keySignature: 'D Minor',
    description: 'Afro-Cuban clave piano montunos intertwined with Bayou fiddle.',
    stylePrompt: 'havana cajun, Cuban piano montuno, cajun fiddle, conga percussion, upright bass',
    chordHz: [146.83, 174.61, 220.0, 261.63],
    color: '#eab308',
  },
  {
    id: 'afro-shoegaze',
    name: 'afro-shoegaze',
    bpm: 110,
    keySignature: 'F# Minor',
    description: 'Polyrhythmic shakers and log drums beneath a wall of fuzz-pedal guitars.',
    stylePrompt: 'afro-shoegaze, polyrhythmic percussion, amapiano log drum, dreamy fuzz reverb guitars',
    chordHz: [185.0, 220.0, 277.18, 329.63],
    color: '#8b5cf6',
  },
  {
    id: 'baroque-breakcore',
    name: 'baroque breakcore',
    bpm: 172,
    keySignature: 'C# Minor',
    description: 'Harpsichord fugues sliced over hyper-edited Amen breaks.',
    stylePrompt: 'baroque breakcore, harpsichord counterpoint, chopped amen breakbeats, sub bass',
    chordHz: [138.59, 164.81, 207.65, 246.94],
    color: '#06b6d4',
  },
];

interface ComparisonMatchup {
  id: string;
  prompt: string;
  category: string;
  trackA: {
    label: string;
    model: string;
    notes: string;
    freqBase: number;
    waveform: OscillatorType;
  };
  trackB: {
    label: string;
    model: string;
    notes: string;
    freqBase: number;
    waveform: OscillatorType;
  };
}

const MATCHUPS: ComparisonMatchup[] = [
  {
    id: 'match-1',
    prompt: 'A nocturnal synthwave drive through rain-slicked Tokyo streets with a soaring sax',
    category: 'Arrangement & Stereo Depth',
    trackA: {
      label: 'Candidate A',
      model: 'v5-alpha-acoustics',
      notes: 'Warm analog saturation, wide chorus Juno pads, expressive breathy tenor sax',
      freqBase: 220,
      waveform: 'sawtooth',
    },
    trackB: {
      label: 'Candidate B',
      model: 'v5-beta-transient',
      notes: 'Punchier gated reverb snare, crystal-clear arpeggio separation, tight sub',
      freqBase: 246.94,
      waveform: 'triangle',
    },
  },
  {
    id: 'match-2',
    prompt: 'Intimate acoustic folk ballad about leaving an old harbour town at sunrise',
    category: 'Vocal Realism & Timbre',
    trackA: {
      label: 'Candidate A',
      model: 'v5-vocal-hd',
      notes: 'Close-mic fingerpicked cedar guitar, delicate vocal harmonies on the chorus',
      freqBase: 196,
      waveform: 'sine',
    },
    trackB: {
      label: 'Candidate B',
      model: 'v5-studio-live',
      notes: 'Natural room ambience, subtle pedal steel swells, dynamic crescendo',
      freqBase: 174.61,
      waveform: 'triangle',
    },
  },
  {
    id: 'match-3',
    prompt: 'High-energy UK garage 2-step club track with soulful chopped vocal hooks',
    category: 'Groove & Low-End Punch',
    trackA: {
      label: 'Candidate A',
      model: 'v5-club-engine',
      notes: 'Swung 2-step hi-hats, deep Reese bassline, crisp vocal formants',
      freqBase: 146.83,
      waveform: 'sawtooth',
    },
    trackB: {
      label: 'Candidate B',
      model: 'v5-groove-plus',
      notes: 'Bouncy organ stabs, tight sub-bass pocket, shimmering ride cymbals',
      freqBase: 164.81,
      waveform: 'square',
    },
  },
];

const MILO_TRACKS = [
  { id: 'lead', name: 'Cyber Lead', freq: 523.25, color: '#ec4899' },
  { id: 'arp', name: 'Neon Arp', freq: 392.0, color: '#a855f7' },
  { id: 'chord', name: 'Warm Pad', freq: 311.13, color: '#38bdf8' },
  { id: 'bass', name: 'Sub Bass', freq: 130.81, color: '#ff6b6b' },
  { id: 'kick', name: 'Pulse Kick', freq: 65.41, color: '#f59e0b' },
  { id: 'hat', name: 'Crisp Hat', freq: 880.0, color: '#10b981' },
] as const;

const DEFAULT_PATTERN: boolean[][] = [
  [true, false, false, true, false, false, true, false, false, false, true, false, true, false, false, false],
  [false, true, true, false, true, false, false, true, false, true, true, false, false, true, false, true],
  [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
  [true, false, true, false, false, true, false, false, true, false, true, false, false, true, false, true],
  [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, true],
];

export default function LabsPage() {
  const navigate = useNavigate();
  const setComposerDraft = useUiStore((state) => state.setComposerDraft);

  const [activeLab, setActiveLab] = useState<ActiveLab>('overview');

  // --- Genre Wheel State ---
  const [selectedGenreIndex, setSelectedGenreIndex] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);

  // --- Listen & Rank State ---
  const [matchupIndex, setMatchupIndex] = useState(0);
  const [votesCast, setVotesCast] = useState<Record<string, 'A' | 'B' | 'tie'>>({});
  const [previewingCandidate, setPreviewingCandidate] = useState<'A' | 'B' | null>(null);

  // --- MILO-1080 State ---
  const [pattern, setPattern] = useState<boolean[][]>(DEFAULT_PATTERN);
  const [miloPlaying, setMiloPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [miloBpm, setMiloBpm] = useState(124);
  const [miloWaveform, setMiloWaveform] = useState<OscillatorType>('sawtooth');
  const [miloFilterCutoff, setMiloFilterCutoff] = useState(2400);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const patternRef = useRef(pattern);
  const waveformRef = useRef(miloWaveform);
  const cutoffRef = useRef(miloFilterCutoff);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  useEffect(() => {
    waveformRef.current = miloWaveform;
  }, [miloWaveform]);

  useEffect(() => {
    cutoffRef.current = miloFilterCutoff;
  }, [miloFilterCutoff]);

  const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playChordPreview = (freqs: number[], wave: OscillatorType = 'triangle', durationSec = 0.9) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.06 + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + durationSec + 0.05);
    });
  };

  // MILO-1080 Web Audio sequencer clock
  useEffect(() => {
    if (!miloPlaying) return;
    const stepMs = (60 / miloBpm / 4) * 1000;
    const timer = window.setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % 16;
        const ctx = getAudioContext();
        if (ctx) {
          const now = ctx.currentTime;
          MILO_TRACKS.forEach((track, trackIdx) => {
            if (patternRef.current[trackIdx]?.[next]) {
              const osc = ctx.createOscillator();
              const filter = ctx.createBiquadFilter();
              const gain = ctx.createGain();

              osc.type = track.id === 'kick' ? 'sine' : waveformRef.current;
              osc.frequency.setValueAtTime(track.freq, now);
              if (track.id === 'kick') {
                osc.frequency.exponentialRampToValueAtTime(32, now + 0.14);
              }

              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(cutoffRef.current, now);

              gain.gain.setValueAtTime(0.001, now);
              gain.gain.linearRampToValueAtTime(track.id === 'kick' ? 0.14 : 0.06, now + 0.01);
              gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

              osc.connect(filter);
              filter.connect(gain);
              gain.connect(ctx.destination);
              osc.start(now);
              osc.stop(now + 0.18);
            }
          });
        }
        return next;
      });
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [miloPlaying, miloBpm]);

  const handleSpinWheel = () => {
    if (spinning) return;
    setSpinning(true);
    const nextIdx = Math.floor(Math.random() * GENRE_WHEEL_ENTRIES.length);
    const extraTurns = 360 * 3 + nextIdx * (360 / GENRE_WHEEL_ENTRIES.length);
    setWheelRotation((prev) => prev + extraTurns);
    window.setTimeout(() => {
      setSelectedGenreIndex(nextIdx);
      setSpinning(false);
      const picked = GENRE_WHEEL_ENTRIES[nextIdx];
      playChordPreview(picked.chordHz, 'triangle', 1.1);
      toast.success(`Landed on "${picked.name}"!`);
    }, 650);
  };

  const handleUseGenreInStudio = (genre: GenreWheelEntry) => {
    setComposerDraft({
      title: `${genre.name.replace(/\b\w/g, (c) => c.toUpperCase())} Session`,
      prompt: `An experimental ${genre.name} song (${genre.bpm} BPM, ${genre.keySignature}) — ${genre.description}`,
      style: genre.stylePrompt,
      contentType: 'songs',
    });
    navigate('/create');
    toast.success(`Sent "${genre.name}" to Studio`);
  };

  const handleVote = (choice: 'A' | 'B' | 'tie') => {
    const current = MATCHUPS[matchupIndex];
    setVotesCast((prev) => ({ ...prev, [current.id]: choice }));
    setPreviewingCandidate(null);
    toast.success(
      choice === 'tie'
        ? 'Recorded tie vote — thank you for helping tune Jamz v5!'
        : `Voted for Candidate ${choice} — thank you for helping tune Jamz v5!`,
    );
    if (matchupIndex < MATCHUPS.length - 1) {
      setMatchupIndex((prev) => prev + 1);
    }
  };

  const handleRandomizeMilo = () => {
    const next = MILO_TRACKS.map((_, rIdx) =>
      Array.from({ length: 16 }, (__, cIdx) => {
        if (rIdx === 4) return cIdx % 4 === 0; // Keep a steady four-on-the-floor kick anchor
        return Math.random() < 0.28;
      }),
    );
    setPattern(next);
    toast.success('Mutated MILO-1080 sequence pattern');
  };

  const selectedGenre = GENRE_WHEEL_ENTRIES[selectedGenreIndex];
  const currentMatchup = MATCHUPS[matchupIndex];
  const completedCount = Object.keys(votesCast).length;

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-8 pb-32">
      {/* Header row + navigation pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#ff6b6b] mb-1">
            <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
            Experimental Playground
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {activeLab === 'overview'
              ? 'Labs'
              : activeLab === 'genre-wheel'
                ? 'Genre Wheel'
                : activeLab === 'listen-rank'
                  ? 'Listen and Rank'
                  : 'MILO-1080 Interactive Sequencer'}
          </h2>
          <p className="text-sm text-white/55 mt-1">
            {activeLab === 'overview'
              ? 'Test-drive upcoming Jamz audio research, interactive discovery tools, and generative instruments.'
              : 'Interactive experiment — send any discovery directly into your Studio workspace.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeLab !== 'overview' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setMiloPlaying(false);
                setActiveLab('overview');
              }}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" aria-hidden="true" />
              All Labs
            </Button>
          )}
          <div
            role="group"
            aria-label="Select Lab experiment"
            className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10"
          >
            {(
              [
                { id: 'overview', label: 'Overview' },
                { id: 'genre-wheel', label: 'Genre Wheel' },
                { id: 'listen-rank', label: 'Listen & Rank' },
                { id: 'milo-1080', label: 'MILO-1080' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id !== 'milo-1080') setMiloPlaying(false);
                  setActiveLab(tab.id);
                }}
                aria-pressed={activeLab === tab.id}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeLab === tab.id
                    ? 'bg-white text-black font-semibold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* OVERVIEW GRID (Matches Image 2) */}
      {activeLab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Genre Wheel */}
          <div className="group rounded-2xl border border-white/10 bg-[#141418] overflow-hidden transition-all hover:border-white/25 flex flex-col">
            <button
              type="button"
              onClick={() => setActiveLab('genre-wheel')}
              aria-label="Open Genre Wheel experiment"
              className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-[#2a1215] via-[#12131a] to-[#0d1f22] p-6 flex items-center justify-center text-left"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-75"
                style={{
                  background:
                    'radial-gradient(circle at 25% 50%, rgba(255, 107, 107, 0.35), transparent 60%)',
                }}
              />
              {/* Radial typography spokes matching Image 2 */}
              <div className="relative w-full h-full flex items-center">
                <div className="w-10 h-10 rounded-full bg-[#ff6b6b] shadow-[0_0_30px_rgba(255,107,107,0.8)] shrink-0 mr-6 flex items-center justify-center">
                  <Compass className="w-5 h-5 text-black" aria-hidden="true" />
                </div>
                <div className="space-y-1 overflow-hidden">
                  {GENRE_WHEEL_ENTRIES.slice(0, 9).map((g, idx) => (
                    <div
                      key={g.id}
                      className={`font-mono tracking-tight transition-transform duration-300 group-hover:translate-x-1 ${
                        idx === 4
                          ? 'text-base sm:text-lg font-bold text-white'
                          : idx === 3 || idx === 5
                            ? 'text-xs sm:text-sm text-white/65'
                            : 'text-[11px] text-white/35'
                      }`}
                      style={{
                        transform: `rotate(${(idx - 4) * 3.5}deg)`,
                        transformOrigin: 'left center',
                      }}
                    >
                      {g.name}
                    </div>
                  ))}
                </div>
              </div>
            </button>

            <div className="p-5 flex items-center justify-between gap-4 flex-1">
              <div>
                <h3 className="text-lg font-bold text-white">Genre Wheel</h3>
                <p className="text-sm text-white/55 mt-0.5">
                  Spin the wheel to discover music across genres
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setActiveLab('genre-wheel')}
                className="bg-white/10 hover:bg-white/15 text-white border border-white/10 shrink-0"
              >
                Launch
              </Button>
            </div>
          </div>

          {/* Card 2: Listen and Rank */}
          <div className="group rounded-2xl border border-white/10 bg-[#141418] overflow-hidden transition-all hover:border-white/25 flex flex-col">
            <button
              type="button"
              onClick={() => setActiveLab('listen-rank')}
              aria-label="Open Listen and Rank experiment"
              className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-[#2d0c38] via-[#131024] to-[#082032] p-6 flex items-center justify-center"
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 25% 50%, rgba(236, 72, 153, 0.35), transparent 55%), radial-gradient(circle at 75% 50%, rgba(56, 189, 248, 0.35), transparent 55%)',
                }}
              />
              <div className="relative z-10 flex items-center gap-6 sm:gap-10">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-pink-500/20 border border-pink-400/40 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.35)] group-hover:scale-105 transition-transform">
                  <Headphones className="w-9 h-9 text-pink-300" aria-hidden="true" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-pink-200 mt-1">
                    Track A
                  </span>
                </div>

                <div className="text-3xl sm:text-4xl font-black italic tracking-tighter bg-gradient-to-r from-amber-300 via-pink-400 to-sky-400 bg-clip-text text-transparent drop-shadow">
                  VS
                </div>

                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(56,189,248,0.35)] group-hover:scale-105 transition-transform">
                  <Headphones className="w-9 h-9 text-sky-300" aria-hidden="true" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-sky-200 mt-1">
                    Track B
                  </span>
                </div>
              </div>
            </button>

            <div className="p-5 flex items-center justify-between gap-4 flex-1">
              <div>
                <h3 className="text-lg font-bold text-white">Listen and Rank</h3>
                <p className="text-sm text-white/55 mt-0.5">
                  Listen to songs, rank your preferences, and complete tasks.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setActiveLab('listen-rank')}
                className="bg-white/10 hover:bg-white/15 text-white border border-white/10 shrink-0"
              >
                Launch
              </Button>
            </div>
          </div>

          {/* Card 3: MILO-1080 (PREVIEW) */}
          <div className="group rounded-2xl border border-white/10 bg-[#141418] overflow-hidden transition-all hover:border-white/25 flex flex-col md:col-span-2 lg:col-span-1">
            <button
              type="button"
              onClick={() => setActiveLab('milo-1080')}
              aria-label="Open MILO-1080 preview experiment"
              className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-[#2b0938] via-[#1b0c2e] to-[#090d16] p-6 flex flex-col justify-between text-left"
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 60% 40%, rgba(236, 72, 153, 0.4), rgba(139, 92, 246, 0.2) 50%, transparent 75%)',
                }}
              />
              <div className="relative z-10 flex items-center justify-between w-full">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-black/60 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-pink-300">
                  <Sliders className="w-3 h-3" aria-hidden="true" />
                  16-Step Synth Matrix
                </span>
                <span className="rounded bg-white/15 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                  PREVIEW
                </span>
              </div>

              {/* Mini matrix preview */}
              <div className="relative z-10 grid grid-cols-8 gap-1.5 my-auto py-4">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-5 rounded-xs border transition-all ${
                      i % 3 === 0 || i % 7 === 0
                        ? 'bg-gradient-to-t from-pink-500 to-amber-300 border-pink-300/60 shadow-[0_0_12px_rgba(236,72,153,0.5)]'
                        : 'bg-white/5 border-white/10'
                    }`}
                  />
                ))}
              </div>

              <div className="relative z-10 flex items-center justify-between text-xs font-mono text-white/60">
                <span>SYS.MILO // 1080-DSP</span>
                <span className="text-pink-300 group-hover:underline">Click to play synth →</span>
              </div>
            </button>

            <div className="p-5 flex items-center justify-between gap-4 flex-1">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">MILO-1080</h3>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/75">
                    PREVIEW
                  </span>
                </div>
                <p className="text-sm text-white/55 mt-0.5">
                  Interactive step sequencer and procedural synth vibe designer.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setActiveLab('milo-1080')}
                className="bg-white/10 hover:bg-white/15 text-white border border-white/10 shrink-0"
              >
                Launch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LAB 1: GENRE WHEEL */}
      {activeLab === 'genre-wheel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-white/10 bg-[#121217] p-6 sm:p-8">
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="relative w-full max-w-md aspect-square rounded-full border border-white/10 bg-[#0b0b0f] p-6 flex items-center justify-center overflow-hidden shadow-2xl">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(circle at center, ${selectedGenre.color}33 0%, transparent 65%)`,
                }}
              />
              <button
                type="button"
                onClick={handleSpinWheel}
                aria-label="Spin the Genre Wheel"
                className="relative z-20 w-24 h-24 rounded-full bg-gradient-to-br from-[#ff6b6b] to-[#ffa502] text-black font-bold text-sm shadow-[0_0_40px_rgba(255,107,107,0.6)] flex flex-col items-center justify-center gap-1 hover:scale-105 active:scale-95 transition-transform"
              >
                <Disc3
                  className={`w-6 h-6 ${spinning ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{spinning ? 'Spinning…' : 'SPIN'}</span>
              </button>

              <div
                className="absolute inset-4 rounded-full transition-transform duration-700 ease-out"
                style={{ transform: `rotate(${wheelRotation}deg)` }}
                aria-hidden="true"
              >
                {GENRE_WHEEL_ENTRIES.map((entry, idx) => {
                  const angle = (idx * 360) / GENRE_WHEEL_ENTRIES.length;
                  const isSelected = idx === selectedGenreIndex;
                  return (
                    <div
                      key={entry.id}
                      className="absolute top-1/2 left-1/2 w-1/2 origin-left pl-14 pr-3"
                      style={{ transform: `translateY(-50%) rotate(${angle}deg)` }}
                    >
                      <span
                        className={`block font-mono text-xs truncate transition-colors ${
                          isSelected ? 'text-white font-bold' : 'text-white/45'
                        }`}
                      >
                        {entry.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct genre pills for keyboard & screen-reader selection */}
            <div
              role="group"
              aria-label="Choose a genre from the wheel"
              className="flex flex-wrap justify-center gap-1.5 mt-6"
            >
              {GENRE_WHEEL_ENTRIES.map((entry, idx) => {
                const active = idx === selectedGenreIndex;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setSelectedGenreIndex(idx);
                      playChordPreview(entry.chordHz, 'triangle', 0.8);
                    }}
                    aria-pressed={active}
                    className={`px-3 py-1 rounded-full text-xs font-mono transition-all ${
                      active
                        ? 'bg-[#ff6b6b] text-black font-bold shadow-sm'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                    }`}
                  >
                    {entry.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/70">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: selectedGenre.color }}
              />
              {selectedGenre.bpm} BPM • {selectedGenre.keySignature}
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white font-mono">{selectedGenre.name}</h3>
              <p className="text-sm text-white/60 mt-2 leading-relaxed">
                {selectedGenre.description}
              </p>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-1">
                Studio Style Prompt
              </div>
              <p className="text-xs font-mono text-white/85">{selectedGenre.stylePrompt}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => playChordPreview(selectedGenre.chordHz, 'triangle', 1.1)}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <Volume2 className="w-4 h-4 mr-2 text-[#ff6b6b]" aria-hidden="true" />
                Preview Chord Motif
              </Button>
              <Button
                type="button"
                onClick={handleSpinWheel}
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <Dices className="w-4 h-4 mr-2" aria-hidden="true" />
                Spin Again
              </Button>
              <Button
                type="button"
                onClick={() => handleUseGenreInStudio(selectedGenre)}
                className="gradient-coral text-black font-semibold w-full sm:w-auto"
              >
                <Wand2 className="w-4 h-4 mr-2" aria-hidden="true" />
                Create with {selectedGenre.name}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LAB 2: LISTEN AND RANK */}
      {activeLab === 'listen-rank' && (
        <div className="rounded-3xl border border-white/10 bg-[#121217] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-pink-400">
                {currentMatchup.category}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                “{currentMatchup.prompt}”
              </h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3.5 py-1.5 text-xs text-white/80 shrink-0">
              <Trophy className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>
                Completed {completedCount} of {MATCHUPS.length} tasks
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Candidate A */}
            <div className="rounded-2xl border border-pink-500/25 bg-gradient-to-b from-pink-500/10 to-black/40 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-pink-300">
                    <Headphones className="w-4 h-4" aria-hidden="true" />
                    {currentMatchup.trackA.label}
                  </span>
                  <span className="text-[11px] font-mono text-white/45">
                    {currentMatchup.trackA.model}
                  </span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed mb-6">
                  {currentMatchup.trackA.notes}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPreviewingCandidate('A');
                    playChordPreview(
                      [
                        currentMatchup.trackA.freqBase,
                        currentMatchup.trackA.freqBase * 1.25,
                        currentMatchup.trackA.freqBase * 1.5,
                      ],
                      currentMatchup.trackA.waveform,
                      1.2,
                    );
                  }}
                  aria-label="Preview Candidate A audio"
                  className="w-full border-pink-400/30 bg-pink-500/10 text-white hover:bg-pink-500/20"
                >
                  <Play className="w-4 h-4 mr-2 fill-white" aria-hidden="true" />
                  {previewingCandidate === 'A' ? 'Playing Candidate A…' : 'Listen to Candidate A'}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleVote('A')}
                  className="w-full bg-pink-500 hover:bg-pink-400 text-black font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
                  Prefer Candidate A
                </Button>
              </div>
            </div>

            {/* Candidate B */}
            <div className="rounded-2xl border border-sky-500/25 bg-gradient-to-b from-sky-500/10 to-black/40 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-sky-300">
                    <Headphones className="w-4 h-4" aria-hidden="true" />
                    {currentMatchup.trackB.label}
                  </span>
                  <span className="text-[11px] font-mono text-white/45">
                    {currentMatchup.trackB.model}
                  </span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed mb-6">
                  {currentMatchup.trackB.notes}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPreviewingCandidate('B');
                    playChordPreview(
                      [
                        currentMatchup.trackB.freqBase,
                        currentMatchup.trackB.freqBase * 1.2,
                        currentMatchup.trackB.freqBase * 1.5,
                      ],
                      currentMatchup.trackB.waveform,
                      1.2,
                    );
                  }}
                  aria-label="Preview Candidate B audio"
                  className="w-full border-sky-400/30 bg-sky-500/10 text-white hover:bg-sky-500/20"
                >
                  <Play className="w-4 h-4 mr-2 fill-white" aria-hidden="true" />
                  {previewingCandidate === 'B' ? 'Playing Candidate B…' : 'Listen to Candidate B'}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleVote('B')}
                  className="w-full bg-sky-400 hover:bg-sky-300 text-black font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
                  Prefer Candidate B
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2">
              {MATCHUPS.map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMatchupIndex(idx)}
                  aria-label={`Switch to comparison task ${idx + 1}`}
                  aria-pressed={idx === matchupIndex}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    idx === matchupIndex
                      ? 'bg-white text-black font-semibold'
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  Task #{idx + 1} {votesCast[m.id] ? `(${votesCast[m.id]})` : ''}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleVote('tie')}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              Both Sound Equally Good (Tie)
            </Button>
          </div>
        </div>
      )}

      {/* LAB 3: MILO-1080 SEQUENCER */}
      {activeLab === 'milo-1080' && (
        <div className="rounded-3xl border border-white/10 bg-[#121217] p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={() => setMiloPlaying((p) => !p)}
                className={
                  miloPlaying
                    ? 'bg-pink-500 hover:bg-pink-400 text-black font-semibold'
                    : 'gradient-coral text-black font-semibold'
                }
              >
                {miloPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2 fill-black" aria-hidden="true" />
                    Stop Sequencer
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2 fill-black" aria-hidden="true" />
                    Play MILO-1080
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleRandomizeMilo}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <Dices className="w-4 h-4 mr-2" aria-hidden="true" />
                Mutate Pattern
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPattern(DEFAULT_PATTERN);
                  toast.success('Reset MILO-1080 pattern');
                }}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
                Reset
              </Button>
            </div>

            <Button
              type="button"
              onClick={() => {
                setMiloPlaying(false);
                setComposerDraft({
                  title: `MILO-1080 Pulse (${miloBpm} BPM)`,
                  prompt: `A futuristic electronic track created with MILO-1080 synth matrix at ${miloBpm} BPM using ${miloWaveform} oscillators`,
                  style: `Electronic, ${miloBpm} BPM, ${miloWaveform} lead synth, resonant lowpass filter, punchy 909 drums`,
                  contentType: 'songs',
                });
                navigate('/create');
                toast.success('Sent MILO-1080 synth parameters to Studio');
              }}
              className="bg-white/10 hover:bg-white/15 text-white border border-white/15"
            >
              <Sparkles className="w-4 h-4 mr-2 text-[#ff6b6b]" aria-hidden="true" />
              Send Vibe to Studio
            </Button>
          </div>

          {/* Synth controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl bg-black/40 border border-white/10 p-4">
            <div>
              <div className="flex items-center justify-between text-xs text-white/70 mb-1.5">
                <label htmlFor="milo-bpm-slider">Tempo (BPM)</label>
                <span className="font-mono text-white">{miloBpm} BPM</span>
              </div>
              <input
                id="milo-bpm-slider"
                type="range"
                min={80}
                max={165}
                value={miloBpm}
                onChange={(e) => setMiloBpm(Number(e.target.value))}
                aria-label="MILO-1080 Tempo in BPM"
                className="w-full accent-[#ff6b6b]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-white/70 mb-1.5">
                <label htmlFor="milo-cutoff-slider">Filter Cutoff</label>
                <span className="font-mono text-white">{miloFilterCutoff} Hz</span>
              </div>
              <input
                id="milo-cutoff-slider"
                type="range"
                min={400}
                max={5000}
                step={50}
                value={miloFilterCutoff}
                onChange={(e) => setMiloFilterCutoff(Number(e.target.value))}
                aria-label="MILO-1080 Lowpass Filter Cutoff"
                className="w-full accent-pink-500"
              />
            </div>

            <div>
              <div className="text-xs text-white/70 mb-1.5">Oscillator Waveform</div>
              <div
                role="group"
                aria-label="Oscillator Waveform"
                className="grid grid-cols-4 gap-1 bg-white/5 p-1 rounded-lg border border-white/10"
              >
                {(['sawtooth', 'square', 'triangle', 'sine'] as const).map((wave) => (
                  <button
                    key={wave}
                    type="button"
                    onClick={() => setMiloWaveform(wave)}
                    aria-label={`Select ${wave} waveform`}
                    aria-pressed={miloWaveform === wave}
                    className={`py-1 rounded text-[11px] font-mono capitalize transition-colors ${
                      miloWaveform === wave
                        ? 'bg-pink-500 text-black font-bold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {wave.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 16-step matrix */}
          <div className="space-y-2.5 overflow-x-auto pb-2">
            {MILO_TRACKS.map((track, trackIdx) => (
              <div key={track.id} className="flex items-center gap-3 min-w-[640px]">
                <div className="w-28 shrink-0 flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: track.color }}
                  />
                  <span className="text-xs font-mono text-white/80 truncate">{track.name}</span>
                </div>

                <div className="grid grid-cols-16 gap-1.5 flex-1">
                  {Array.from({ length: 16 }).map((_, stepIdx) => {
                    const isOn = pattern[trackIdx]?.[stepIdx] ?? false;
                    const isCurrent = miloPlaying && currentStep === stepIdx;
                    return (
                      <button
                        key={stepIdx}
                        type="button"
                        onClick={() => {
                          setPattern((prev) =>
                            prev.map((row, r) =>
                              r === trackIdx
                                ? row.map((cell, c) => (c === stepIdx ? !cell : cell))
                                : row,
                            ),
                          );
                        }}
                        aria-label={`Toggle ${track.name} step ${stepIdx + 1}`}
                        aria-pressed={isOn}
                        className={`h-9 rounded-md border transition-all ${
                          isOn
                            ? 'border-white/50 shadow-sm'
                            : stepIdx % 4 === 0
                              ? 'bg-white/[0.07] border-white/15 hover:bg-white/15'
                              : 'bg-white/[0.03] border-white/10 hover:bg-white/10'
                        } ${isCurrent ? 'ring-2 ring-white scale-105' : ''}`}
                        style={
                          isOn
                            ? {
                                backgroundColor: track.color,
                                boxShadow: `0 0 12px ${track.color}66`,
                              }
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
