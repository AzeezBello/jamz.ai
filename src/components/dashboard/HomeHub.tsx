import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  ChevronRight,
  Disc3,
  Fingerprint,
  Loader2,
  Mic2,
  Pause,
  Play,
  Plus,
  Sparkles,
  Star,
  Wand2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useGenerationStore } from '@/store/generationStore';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { formatCount } from '@/lib/format';
import type { Song } from '@/lib/types';

interface HomeHubProps {
  onNavigateTab: (tab: 'library' | 'discover' | 'favourites' | 'home') => void;
}

const CURATED_COLLECTIONS = [
  {
    id: 'best-of-speech',
    title: 'Best of Speech',
    subtitle: 'Jamz · 13 songs',
    searchQuery: 'speech',
    style: 'spoken word, cinematic narration, warm background groove',
    gradient:
      'radial-gradient(circle at 30% 25%, #ec4899 0%, #6366f1 45%, #0f172a 100%)',
  },
  {
    id: 'golden-hour',
    title: 'Golden Hour',
    subtitle: 'Jamz · 19 songs',
    searchQuery: 'golden',
    style: 'warm acoustic guitar, golden hour indie folk, soft analog tape',
    gradient:
      'radial-gradient(circle at 50% 45%, #fde047 0%, #f97316 55%, #7c2d12 100%)',
  },
  {
    id: 'late-night-drives',
    title: 'Late Night Drives',
    subtitle: 'Jamz · 19 songs',
    searchQuery: 'night',
    style: 'midnight synthwave, deep sub bass, atmospheric pads, neon arpeggios',
    gradient:
      'radial-gradient(circle at 50% 50%, #818cf8 0%, #312e81 55%, #090d16 100%)',
  },
  {
    id: 'remix-essentials',
    title: 'Remix Essentials',
    subtitle: 'Jamz · 16 songs',
    searchQuery: 'groove',
    style: 'punchy breakbeats,chopped vocal hooks, warm analog bassline',
    gradient:
      'radial-gradient(circle at 70% 30%, #f59e0b 0%, #4f46e5 55%, #1e1b4b 100%)',
  },
  {
    id: 'in-the-ring',
    title: 'In The Ring',
    subtitle: 'Jamz · 28 songs',
    searchQuery: 'anthem',
    style: 'heavy brass fanfare, stadium drums, high-energy workout anthem',
    gradient:
      'radial-gradient(circle at 50% 50%, #fef08a 0%, #ef4444 50%, #7f1d1d 100%)',
  },
];

export default function HomeHub({ onNavigateTab }: HomeHubProps) {
  const navigate = useNavigate();
  const [quickPrompt, setQuickPrompt] = useState('');
  const [speechMode, setSpeechMode] = useState(false);

  const { start, submitting } = useGenerationStore();
  const publicSongs = useLibraryStore((state) => state.publicSongs);
  const mySongs = useLibraryStore((state) => state.mySongs);
  const setQuery = useLibraryStore((state) => state.setQuery);
  const projects = useProjectStore((state) => state.projects);
  const setComposerDraft = useUiStore((state) => state.setComposerDraft);
  const play = usePlayerStore((state) => state.play);
  const toggle = usePlayerStore((state) => state.toggle);
  const currentSong = usePlayerStore((state) => state.currentSong);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const profile = useAuthStore((state) => state.profile);

  // Infer user's favourite genre from their library, defaulting to Reggae (like Image 4).
  const inferredGenre = (() => {
    for (const song of mySongs) {
      const first = song.style?.split(',')[0]?.trim();
      if (first && first.length <= 20) {
        return first.charAt(0).toUpperCase() + first.slice(1);
      }
    }
    return 'Reggae';
  })();

  const handleQuickCreate = async () => {
    const trimmed = quickPrompt.trim();
    if (trimmed.length < 3) {
      toast.error('Describe the song you want to make in a few words.');
      return;
    }

    const job = await start({
      prompt: trimmed,
      style: speechMode
        ? 'spoken word narration, expressive voiceover with matching background music'
        : undefined,
      seconds: 45,
    });

    if (job) {
      setQuickPrompt('');
      toast.success('Creating your track now.');
    } else {
      toast.error(useGenerationStore.getState().error ?? 'Could not start generation.');
    }
  };

  const openInStudio = (draft: Parameters<typeof setComposerDraft>[0]) => {
    setComposerDraft(draft);
    navigate('/create');
  };

  // Partition public & user songs into the 3 personalized feed columns
  const allPool = publicSongs.length >= 3 ? publicSongs : [...publicSongs, ...mySongs];
  const forYouSongs = allPool.slice(0, 3);
  const staffPickSongs = [...allPool].sort((a, b) => b.play_count - a.play_count).slice(0, 3);
  const genreSongs = [...allPool].reverse().slice(0, 3);

  return (
    <div className="space-y-10">
      {/* Hero Prompt Banner ("Turn your thoughts into music" - Image 4) */}
      <section
        aria-label="Quick create"
        className="relative overflow-hidden rounded-3xl border border-white/10 px-6 py-12 text-center"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(234, 88, 12, 0.28) 0%, rgba(154, 52, 18, 0.14) 40%, rgba(12, 12, 12, 0.95) 80%)',
        }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6">
          Turn your thoughts into music
        </h2>

        <div className="mx-auto max-w-2xl rounded-2xl border border-white/15 bg-black/55 p-3 backdrop-blur-xl shadow-2xl">
          <label htmlFor="home-quick-prompt" className="sr-only">
            Describe the song you want to make
          </label>
          <textarea
            id="home-quick-prompt"
            rows={2}
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleQuickCreate();
              }
            }}
            placeholder={
              speechMode
                ? 'Describe the voiceover statement and background music…'
                : 'Describe the song you want to make'
            }
            className="w-full resize-none bg-transparent px-2 py-1 text-sm md:text-base text-white placeholder:text-white/40 outline-none"
          />

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() =>
                  openInStudio({
                    prompt: quickPrompt,
                    contentType: speechMode ? 'speech' : 'songs',
                    mode: 'advanced',
                  })
                }
                aria-label="Open full studio with reference uploads"
                className="h-8 w-8 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSpeechMode(!speechMode)}
                aria-pressed={speechMode}
                className={`h-8 rounded-full px-3 text-xs ${
                  speechMode
                    ? 'bg-pink-500/25 text-pink-200 border border-pink-500/40'
                    : 'bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                <Mic2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                Speech mode
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() =>
                  openInStudio({
                    prompt: quickPrompt,
                    contentType: speechMode ? 'speech' : 'songs',
                    mode: 'advanced',
                  })
                }
                aria-label="Customize in advanced studio"
                className="h-8 w-8 rounded-full bg-white/10 text-white/75 hover:bg-white/20 hover:text-white"
              >
                <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>

              <Button
                type="button"
                onClick={() => void handleQuickCreate()}
                disabled={submitting}
                className="h-9 rounded-full bg-gradient-to-r from-[#ff4d6d] to-[#ff9e44] px-5 text-xs font-semibold text-white hover:opacity-95"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                )}
                Create
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Two Feature Spotlight Banners (Image 4) */}
      <section aria-label="Featured capabilities" className="grid gap-5 lg:grid-cols-2">
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10 p-6 flex flex-col justify-between min-h-[210px]"
          style={{
            background:
              'linear-gradient(135deg, rgba(14, 165, 233, 0.22) 0%, rgba(17, 24, 39, 0.9) 55%, rgba(10, 10, 10, 0.98) 100%)',
          }}
        >
          <div>
            <span className="inline-block rounded-full bg-sky-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black mb-3">
              Artist Spotlight
            </span>
            <h3 className="text-xl font-bold text-white mb-1.5">
              Create the unheard of with v5.
            </h3>
            <p className="text-xs sm:text-sm text-white/65 max-w-md">
              See how creators explore new sound with v5, blending warm analog fidelity with the
              unexpected.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            <Button
              type="button"
              size="sm"
              onClick={() =>
                openInStudio({
                  model: profile?.plan_id === 'free' ? 'v4.5' : 'v5',
                  style: 'cinematic analog warmth, expressive vocals, lush arrangement',
                  mode: 'advanced',
                })
              }
              className="rounded-full bg-white text-black hover:bg-white/90 text-xs font-semibold px-4"
            >
              Create with v5
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (staffPickSongs[0]) {
                  void play(staffPickSongs[0], staffPickSongs);
                } else {
                  onNavigateTab('discover');
                }
              }}
              className="rounded-full border-white/15 bg-black/50 text-white hover:bg-white/10 text-xs px-4"
            >
              <Play className="w-3 h-3 mr-1.5" fill="currentColor" aria-hidden="true" />
              Listen to showcase
            </Button>
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl border border-white/10 p-6 flex flex-col justify-between min-h-[210px]"
          style={{
            background:
              'linear-gradient(135deg, rgba(236, 72, 153, 0.24) 0%, rgba(49, 46, 129, 0.45) 55%, rgba(10, 10, 10, 0.98) 100%)',
          }}
        >
          <div>
            <span className="inline-block rounded-full bg-pink-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black mb-3">
              Beta Feature
            </span>
            <h3 className="text-xl font-bold text-white mb-1.5">
              Make a statement with Speech (beta).
            </h3>
            <p className="text-xs sm:text-sm text-white/65 max-w-md">
              Introducing the first mode to create expressive spoken word, radio drops, and stories
              with matching background music.
            </p>
          </div>

          <div className="flex items-center gap-2.5 mt-5">
            <Button
              type="button"
              size="sm"
              onClick={() =>
                openInStudio({
                  contentType: 'speech',
                  prompt: 'Energetic cheerleader chant with matching stadium brass and drums',
                  style: 'spoken word, stadium brass, marching drums',
                  mode: 'advanced',
                })
              }
              className="rounded-full bg-white text-black hover:bg-white/90 text-xs font-semibold px-4"
            >
              Try Speech
            </Button>
          </div>
        </div>
      </section>

      {/* 3-Column Personalized Feed Cards: For You | Staff Picks | Because You Create <Genre> (Image 4) */}
      <section aria-label="Personalized recommendations" className="grid gap-5 lg:grid-cols-3">
        <FeedColumnCard
          title="For You"
          badgeGradient="linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #4ade80 100%)"
          icon={Fingerprint}
          songs={forYouSongs}
          currentSongId={currentSong?.id}
          isPlaying={isPlaying}
          onPlay={(song) =>
            currentSong?.id === song.id ? toggle() : void play(song, forYouSongs)
          }
          onSeeMore={() => onNavigateTab('discover')}
        />

        <FeedColumnCard
          title="Staff Picks"
          badgeGradient="linear-gradient(135deg, #f43f5e 0%, #a855f7 50%, #3b82f6 100%)"
          icon={Star}
          verifiedBadge
          songs={staffPickSongs}
          currentSongId={currentSong?.id}
          isPlaying={isPlaying}
          onPlay={(song) =>
            currentSong?.id === song.id ? toggle() : void play(song, staffPickSongs)
          }
          onSeeMore={() => onNavigateTab('discover')}
        />

        <FeedColumnCard
          title={`Because You Create ${inferredGenre}`}
          badgeGradient="linear-gradient(135deg, #facc15 0%, #a855f7 60%, #ec4899 100%)"
          icon={Disc3}
          songs={genreSongs}
          currentSongId={currentSong?.id}
          isPlaying={isPlaying}
          onPlay={(song) =>
            currentSong?.id === song.id ? toggle() : void play(song, genreSongs)
          }
          onSeeMore={() => onNavigateTab('discover')}
        />
      </section>

      {/* New Albums / Workspaces Carousel (Image 4) */}
      {projects.length > 0 && (
        <section aria-label="New Albums and Workspaces">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">New Albums & Workspaces</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab('library')}
              className="rounded-full bg-white/5 text-white/70 hover:text-white text-xs"
            >
              See all <ChevronRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {projects.slice(0, 5).map((project, index) => (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  setQuery({ projectId: project.id });
                  onNavigateTab('library');
                }}
                aria-label={`Open workspace ${project.title}`}
                className="group text-left rounded-xl p-2.5 bg-white/[0.03] border border-white/10 hover:border-white/25 transition-all"
              >
                <div
                  className="aspect-square w-full rounded-lg mb-2.5 overflow-hidden relative"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, hsl(${(index * 72 + 20) % 360} 80% 58%), hsl(${(index * 72 + 160) % 360} 70% 25%))`,
                  }}
                >
                  <img
                    src={`/images/song-${(index % 8) + 1}.jpg`}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover mix-blend-overlay opacity-75 group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-sm font-semibold text-white truncate">{project.title}</p>
                <p className="text-xs text-white/45 truncate">
                  {profile?.display_name || 'You'} · {project.song_count} songs
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Curated Collections (Image 4) */}
      <section aria-label="Curated Collections">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Curated Collections</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTab('discover')}
            className="rounded-full bg-white/5 text-white/70 hover:text-white text-xs"
          >
            See all <ChevronRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CURATED_COLLECTIONS.map((collection) => (
            <button
              key={collection.id}
              type="button"
              onClick={() =>
                openInStudio({
                  prompt: `${collection.title} inspired track`,
                  style: collection.style,
                  mode: 'advanced',
                })
              }
              aria-label={`Explore ${collection.title} collection`}
              className="group text-left rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10 hover:border-white/25 transition-all p-2.5"
            >
              <div
                className="aspect-square rounded-xl mb-3 relative overflow-hidden flex items-end p-3"
                style={{ background: collection.gradient }}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-white/90 bg-black/35 backdrop-blur-xs px-2.5 py-1 rounded-full">
                  {collection.title}
                </span>
              </div>
              <p className="text-sm font-semibold text-white truncate group-hover:text-[#ff8e8e] transition-colors">
                {collection.title}
              </p>
              <p className="text-xs text-white/45 truncate">{collection.subtitle}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="flex justify-center pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onNavigateTab('discover')}
          className="rounded-full border-white/15 bg-white/5 hover:bg-white/10 text-white px-6 py-5 text-sm font-medium"
        >
          Explore more songs on Jamz <ChevronRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function FeedColumnCard({
  title,
  badgeGradient,
  icon: Icon,
  verifiedBadge = false,
  songs,
  currentSongId,
  isPlaying,
  onPlay,
  onSeeMore,
}: {
  title: string;
  badgeGradient: string;
  icon: typeof Fingerprint;
  verifiedBadge?: boolean;
  songs: Song[];
  currentSongId?: string;
  isPlaying: boolean;
  onPlay: (song: Song) => void;
  onSeeMore: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111111] p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3.5 mb-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ background: badgeGradient }}
          >
            <Icon className="w-7 h-7 text-black/80" aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-white leading-snug">{title}</h3>
        </div>

        {songs.length > 0 ? (
          <ul className="space-y-3 mb-5">
            {songs.map((song) => {
              const active = currentSongId === song.id;
              return (
                <li key={song.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onPlay(song)}
                    aria-label={active && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                    className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b6b]"
                  >
                    <img
                      src={song.cover_url ?? '/images/song-1.jpg'}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {active && isPlaying ? (
                        <Pause className="w-4 h-4 text-white" fill="currentColor" aria-hidden="true" />
                      ) : (
                        <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" aria-hidden="true" />
                      )}
                    </span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/song/${song.id}`}
                        className={`text-sm font-semibold truncate hover:underline ${
                          active ? 'text-[#ff6b6b]' : 'text-white'
                        }`}
                      >
                        {song.title}
                      </Link>
                      <span className="rounded bg-[#ff6b6b]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#ff8e8e] shrink-0">
                        {song.model_version || 'v5'}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 truncate flex items-center gap-1">
                      {song.artist || 'Creator'}
                      {verifiedBadge && (
                        <CheckCircle2
                          className="w-3 h-3 text-rose-400 shrink-0"
                          aria-label="Verified creator"
                        />
                      )}
                    </p>
                    <p className="text-[11px] text-white/35 truncate">
                      ▸ {formatCount(song.play_count)} · {song.style?.split(',')[0] || 'Original'}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-white/40 py-8 text-center">
            Create or publish a song to populate this feed.
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onSeeMore}
        className="w-full rounded-full border-white/10 bg-white/[0.03] hover:bg-white/10 text-white/80 text-xs"
      >
        See more
      </Button>
    </div>
  );
}
