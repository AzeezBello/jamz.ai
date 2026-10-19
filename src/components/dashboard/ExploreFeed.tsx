import { useMemo } from 'react';
import { toast } from 'sonner';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Disc3,
  Heart,
  Pause,
  Play,
  Repeat2,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useUiStore } from '@/store/uiStore';
import { formatCount } from '@/lib/format';
import type { Song } from '@/lib/types';

const FALLBACK_SONGS: Song[] = [
  {
    id: 'explore-showcase-1',
    user_id: 'showcase',
    title: 'Neon Mirage',
    prompt: 'Analog synthwave anthem with gated reverb drums and soaring brass lead',
    style: 'Synthwave, Analog Juno-106, 118 BPM',
    lyrics: '[Verse 1]\nNeon reflections on the midnight glass',
    is_instrumental: false,
    duration_seconds: 194,
    cover_url: '/song-cover-1.jpg',
    visibility: 'public',
    play_count: 4820,
    like_count: 640,
    commercial_use: true,
    model_version: 'v5',
    created_at: new Date().toISOString(),
    artist: 'Solaris 88',
  },
  {
    id: 'explore-showcase-2',
    user_id: 'showcase',
    title: 'Kingston Twilight Dub',
    prompt: '1970s roots reggae dub with spring reverb snare and warm upright bass',
    style: 'Roots Reggae, Dub Tape Echo, Organ Skank',
    lyrics: '[Chorus]\nHold the rhythm steady through the Kingston rain',
    is_instrumental: false,
    duration_seconds: 212,
    cover_url: '/song-cover-2.jpg',
    visibility: 'public',
    play_count: 3910,
    like_count: 520,
    commercial_use: true,
    model_version: 'v5',
    created_at: new Date().toISOString(),
    artist: 'ToneTone Music',
  },
  {
    id: 'explore-showcase-3',
    user_id: 'showcase',
    title: 'Velvet Rhodes 3AM',
    prompt: 'Late night neo-soul groove with Fender Rhodes chords and brushed snare',
    style: 'Neo-Soul, Rhodes Piano, Laid-back Pocket',
    lyrics: '[Verse 1]\nStreetlights flicker on the window pane',
    is_instrumental: false,
    duration_seconds: 178,
    cover_url: '/song-cover-3.jpg',
    visibility: 'public',
    play_count: 5490,
    like_count: 890,
    commercial_use: true,
    model_version: 'v5',
    created_at: new Date().toISOString(),
    artist: 'Velvet Echo',
  },
  {
    id: 'explore-showcase-4',
    user_id: 'showcase',
    title: 'Lagos Log Drum Pulse',
    prompt: 'High-energy Afrobeats and Amapiano fusion with deep log drums and shakers',
    style: 'Afrobeats, Amapiano Log Drum, Percussive Groove',
    lyrics: null,
    is_instrumental: true,
    duration_seconds: 205,
    cover_url: '/song-cover-4.jpg',
    visibility: 'public',
    play_count: 6150,
    like_count: 930,
    commercial_use: true,
    model_version: 'v5',
    created_at: new Date().toISOString(),
    artist: 'Kora Waves',
  },
  {
    id: 'explore-showcase-5',
    user_id: 'showcase',
    title: 'Chrome & 808s',
    prompt: 'Melodic trap production with atmospheric flute motif and booming sub glides',
    style: 'Hip Hop, Melodic Trap, 808 Glides',
    lyrics: '[Chorus]\nCount the miles beneath the city glow',
    is_instrumental: false,
    duration_seconds: 164,
    cover_url: '/song-cover-5.jpg',
    visibility: 'public',
    play_count: 7340,
    like_count: 1120,
    commercial_use: true,
    model_version: 'v5',
    created_at: new Date().toISOString(),
    artist: 'Playstar',
  },
  {
    id: 'explore-showcase-6',
    user_id: 'showcase',
    title: 'Warehouse Acid 303',
    prompt: 'Peak-time club house roller with resonant TB-303 bassline and crisp 909 hats',
    style: 'House, Acid 303, 126 BPM Club Roller',
    lyrics: null,
    is_instrumental: true,
    duration_seconds: 228,
    cover_url: '/song-cover-6.jpg',
    visibility: 'public',
    play_count: 4290,
    like_count: 605,
    commercial_use: true,
    model_version: 'v5',
    created_at: new Date().toISOString(),
    artist: 'RedPest',
  },
];

const BEST_OF_GENRES = [
  {
    id: 'hip-hop',
    title: 'Hip Hop',
    subtitle: '808s, boom-bap, trap & melodic flows',
    style: 'Hip Hop, 808 bass, crisp hi-hats, melodic rap',
    gradient:
      'radial-gradient(circle at 20% 20%, #f59e0b 0%, #ef4444 45%, #7c2d12 100%)',
  },
  {
    id: 'jazz',
    title: 'Jazz',
    subtitle: 'Smoky sax, upright bass & brushed drums',
    style: 'Neo-Jazz, warm saxophone, upright bass, brushed drums',
    gradient:
      'radial-gradient(circle at 80% 25%, #fde047 0%, #eab308 45%, #15803d 100%)',
  },
  {
    id: 'pop',
    title: 'Pop',
    subtitle: 'Hook-driven anthems & shimmering synths',
    style: 'Modern Pop, shimmering synths, punchy drums, catchy chorus',
    gradient:
      'radial-gradient(circle at 25% 30%, #f472b6 0%, #ec4899 50%, #db2777 100%)',
  },
  {
    id: 'house',
    title: 'House',
    subtitle: 'Four-on-the-floor grooves & club pianos',
    style: 'Deep House, 124 BPM, warm sub bass, soulful vocal chops',
    gradient:
      'radial-gradient(circle at 75% 25%, #fb7185 0%, #9333ea 55%, #1e1b4b 100%)',
  },
  {
    id: 'reggae',
    title: 'Reggae',
    subtitle: 'Offbeat skank guitar & warm dub basslines',
    style: 'Roots Reggae, dub delay, warm bassline, offbeat guitar skank',
    gradient:
      'radial-gradient(circle at 30% 25%, #38bdf8 0%, #10b981 55%, #065f46 100%)',
  },
  {
    id: 'electronic',
    title: 'Electronic',
    subtitle: 'Modular arps, breakbeats & lush pads',
    style: 'Electronic, modular synth arpeggios, atmospheric pads, crisp breakbeat',
    gradient:
      'radial-gradient(circle at 70% 25%, #f97316 0%, #14b8a6 55%, #0f172a 100%)',
  },
] as const;

const CREATORS = [
  {
    id: 'creator-playstar',
    name: 'Playstar',
    handle: '@playstar',
    bio: 'Popular on Jamz',
    style: 'Melodic Trap, Lush 808s',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ec4899 55%, #6366f1 100%)',
    initials: 'PS',
  },
  {
    id: 'creator-redpest',
    name: 'RedPest',
    handle: '@redpest',
    bio: 'Popular on Jamz',
    style: 'Dark Synthwave, Cyberpunk',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #991b1b 55%, #111827 100%)',
    initials: 'RP',
  },
  {
    id: 'creator-tonetone',
    name: 'ToneTone Music',
    handle: '@tonetone',
    bio: 'Popular on Jamz',
    style: 'Soulful R&B, Gospel Chords',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #ea580c 55%, #7c2d12 100%)',
    initials: 'TT',
  },
  {
    id: 'creator-velvet',
    name: 'Velvet Echo',
    handle: '@velvetecho',
    bio: 'Popular on Jamz',
    style: 'Dream Pop, Shoegaze',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 55%, #3b82f6 100%)',
    initials: 'VE',
  },
  {
    id: 'creator-kora',
    name: 'Kora Waves',
    handle: '@korawaves',
    bio: 'Popular on Jamz',
    style: 'Afrobeats, Amapiano log drums',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 55%, #064e3b 100%)',
    initials: 'KW',
  },
  {
    id: 'creator-solaris',
    name: 'Solaris 88',
    handle: '@solaris88',
    bio: 'Popular on Jamz',
    style: 'Analog House, Acid 303',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 55%, #312e81 100%)',
    initials: 'S8',
  },
] as const;

function CoverThumb({ song }: { song: Song }) {
  if (song.cover_url) {
    return (
      <img
        src={song.cover_url}
        alt=""
        loading="lazy"
        className="w-full h-full object-cover"
      />
    );
  }
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #ff6b6b 0%, #8b5cf6 55%, #0f172a 100%)',
      }}
    >
      <Disc3 className="w-8 h-8 text-white/70" aria-hidden="true" />
    </div>
  );
}

interface ExploreFeedProps {
  publicSongs: Song[];
  likedCount: number;
  onSelectGenre: (genre: string) => void;
  onNavigateTab: (tab: 'home' | 'library' | 'discover' | 'favourites') => void;
}

export default function ExploreFeed({
  publicSongs,
  likedCount,
  onSelectGenre,
  onNavigateTab,
}: ExploreFeedProps) {
  const currentSong = usePlayerStore((state) => state.currentSong);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const play = usePlayerStore((state) => state.play);
  const toggle = usePlayerStore((state) => state.toggle);
  const recentSongs = usePlayerStore((state) => state.recentSongs);

  const followedCreators = useUiStore((state) => state.followedCreators);
  const toggleFollowCreator = useUiStore((state) => state.toggleFollowCreator);
  const setComposerDraft = useUiStore((state) => state.setComposerDraft);

  const feedSongs = useMemo(() => {
    if (publicSongs.length >= 6) return publicSongs;
    const existingIds = new Set(publicSongs.map((s) => s.id));
    return [...publicSongs, ...FALLBACK_SONGS.filter((s) => !existingIds.has(s.id))];
  }, [publicSongs]);

  const studioShowcase = useMemo(() => feedSongs.slice(0, 6), [feedSongs]);
  const remixableSongs = useMemo(() => [...feedSongs].reverse().slice(0, 6), [feedSongs]);

  const handlePlaySong = (song: Song, list: Song[]) => {
    if (currentSong?.id === song.id) {
      toggle();
    } else {
      play(song, list);
    }
  };

  const handleRemixSong = (song: Song) => {
    setComposerDraft({
      title: `${song.title} (Remix)`,
      prompt: song.prompt || `A fresh remix of ${song.title} with ${song.style}`,
      style: song.style,
      lyrics: song.lyrics || '',
      instrumental: song.is_instrumental,
      contentType: 'songs',
    });
    onNavigateTab('library');
    toast.success(`Loaded "${song.title}" into Studio for remixing`);
  };

  const handlePlayRecent = () => {
    if (recentSongs.length > 0) {
      play(recentSongs[0], recentSongs);
      toast.success(`Playing ${recentSongs.length} recently played tracks`);
    } else if (studioShowcase.length > 0) {
      play(studioShowcase[0], studioShowcase);
      toast.success('Playing featured tracks');
    }
  };

  return (
    <div className="space-y-10 mb-10">
      {/* Top Row: Jump Back In + Made in Jamz Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Jump Back In */}
        <section aria-label="Jump Back In" className="lg:col-span-5 flex flex-col">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">Jump Back In</h2>
            <p className="text-xs text-white/45">Pick up where you left off</p>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            <button
              type="button"
              onClick={() => onNavigateTab('favourites')}
              aria-label="Open Liked Songs"
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#141418] p-4 text-left transition-all hover:border-white/25 hover:bg-[#19191f]"
            >
              <div
                className="aspect-square w-full rounded-xl mb-3 flex items-center justify-center relative overflow-hidden shadow-lg"
                style={{
                  background:
                    'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
                }}
              >
                <Heart className="w-12 h-12 text-white fill-white/90 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                <span className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-4 h-4 fill-white ml-0.5" aria-hidden="true" />
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white">Liked Songs</h3>
              <p className="text-xs text-white/45 mt-0.5">
                {likedCount > 0 ? `${likedCount} saved tracks` : 'Your favourite tracks'}
              </p>
            </button>

            <button
              type="button"
              onClick={handlePlayRecent}
              aria-label="Play Recently Played tracks"
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#141418] p-4 text-left transition-all hover:border-white/25 hover:bg-[#19191f]"
            >
              <div
                className="aspect-square w-full rounded-xl mb-3 flex items-center justify-center relative overflow-hidden shadow-lg"
                style={{
                  background:
                    'linear-gradient(135deg, #14b8a6 0%, #0ea5e9 50%, #6366f1 100%)',
                }}
              >
                <Clock className="w-12 h-12 text-white transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                <span className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-4 h-4 fill-white ml-0.5" aria-hidden="true" />
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white">Recently Played</h3>
              <p className="text-xs text-white/45 mt-0.5">
                {recentSongs.length > 0
                  ? `${recentSongs.length} recent tracks`
                  : 'Start listening to build history'}
              </p>
            </button>
          </div>
        </section>

        {/* Made in Jamz Studio */}
        <section aria-label="Made in Jamz Studio" className="lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Made in Jamz Studio
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#ff6b6b]/15 text-[#ff6b6b] border border-[#ff6b6b]/30">
                  v5 Showcase
                </span>
              </h2>
              <p className="text-xs text-white/45">
                Standout multi-track productions arranged by the community
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {studioShowcase.slice(0, 3).map((song) => {
              const active = currentSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  className="group rounded-2xl border border-white/10 bg-[#141418] p-3 transition-all hover:border-white/25 hover:bg-[#19191f]"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                    <CoverThumb song={song} />
                    <span className="absolute top-2 right-2 rounded bg-black/75 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white border border-white/15">
                      STUDIO
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePlaySong(song, studioShowcase)}
                      aria-label={
                        active && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`
                      }
                      className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center text-white"
                    >
                      <span className="w-11 h-11 rounded-full bg-[#ff6b6b] text-black flex items-center justify-center shadow-lg">
                        {active && isPlaying ? (
                          <Pause className="w-5 h-5 fill-black" aria-hidden="true" />
                        ) : (
                          <Play className="w-5 h-5 fill-black ml-0.5" aria-hidden="true" />
                        )}
                      </span>
                    </button>
                  </div>

                  <h3 className="text-sm font-semibold text-white truncate">{song.title}</h3>
                  <p className="text-xs text-white/45 truncate mt-0.5">
                    {song.artist ?? 'Jamz Creator'}
                  </p>
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/5 text-[11px] text-white/45">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <Play className="w-3 h-3" aria-hidden="true" />
                        {formatCount(song.play_count)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3 h-3" aria-hidden="true" />
                        {formatCount(song.like_count)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemixSong(song)}
                      aria-label={`Remix ${song.title}`}
                      className="inline-flex items-center gap-1 text-white/60 hover:text-[#ff6b6b] transition-colors font-medium"
                    >
                      <Repeat2 className="w-3 h-3" aria-hidden="true" />
                      Remix
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Best Of Genres */}
      <section aria-label="Best Of Genres">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Best Of</h2>
            <p className="text-xs text-white/45">
              Top tracks and sonic palettes from every corner of Jamz
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {BEST_OF_GENRES.map((genre) => (
            <div
              key={genre.id}
              className="group rounded-2xl border border-white/10 bg-[#141418] p-3 transition-all hover:border-white/25 hover:bg-[#19191f] flex flex-col"
            >
              <button
                type="button"
                onClick={() => {
                  onSelectGenre(genre.title);
                  toast.success(`Filtering Discover by ${genre.title}`);
                }}
                aria-label={`Explore Best of ${genre.title}`}
                className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 p-3.5 flex flex-col justify-end text-left shadow-md"
                style={{ background: genre.gradient }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-white/75">
                  Best Of
                </span>
                <span className="relative z-10 text-xl font-black text-white tracking-tight leading-tight">
                  {genre.title}
                </span>
              </button>
              <h3 className="text-sm font-semibold text-white">{genre.title}</h3>
              <p className="text-[11px] text-white/45 line-clamp-2 mt-0.5 flex-1">
                {genre.subtitle}
              </p>
              <button
                type="button"
                onClick={() => {
                  setComposerDraft({
                    prompt: `A standout ${genre.title} song with rich production`,
                    style: genre.style,
                    contentType: 'songs',
                  });
                  onNavigateTab('library');
                  toast.success(`Loaded ${genre.title} style into Studio`);
                }}
                aria-label={`Create ${genre.title} song in Studio`}
                className="mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 py-1.5 px-2.5 text-[11px] font-medium text-white/80 hover:text-white transition-colors"
              >
                <Sparkles className="w-3 h-3 text-[#ff6b6b]" aria-hidden="true" />
                Use Style
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Creators You May Like */}
      <section aria-label="Creators You May Like">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Creators You May Like</h2>
            <p className="text-xs text-white/45">
              Follow top community producers and vocalists
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-xs text-white/40">
              Following {followedCreators.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CREATORS.map((creator) => {
            const isFollowing = followedCreators.includes(creator.id);
            return (
              <div
                key={creator.id}
                className="rounded-2xl border border-white/10 bg-[#141418] p-4 flex flex-col items-center text-center transition-all hover:border-white/25 hover:bg-[#19191f]"
              >
                <div
                  className="w-20 h-20 rounded-full mb-3 flex items-center justify-center text-xl font-bold text-white shadow-inner border border-white/15"
                  style={{ background: creator.gradient }}
                  aria-hidden="true"
                >
                  {creator.initials}
                </div>
                <h3 className="text-sm font-semibold text-white truncate w-full">
                  {creator.name}
                </h3>
                <p className="text-[11px] text-white/45 mt-0.5">{creator.bio}</p>
                <p className="text-[10px] text-white/35 truncate w-full mt-1">
                  {creator.style}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    toggleFollowCreator(creator.id);
                    toast.success(
                      isFollowing
                        ? `Unfollowed ${creator.name}`
                        : `Following ${creator.name}`,
                    );
                  }}
                  aria-label={
                    isFollowing ? `Unfollow ${creator.name}` : `Follow ${creator.name}`
                  }
                  aria-pressed={isFollowing}
                  className={`mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-full py-1.5 px-3 text-xs font-semibold transition-all ${
                    isFollowing
                      ? 'bg-[#ff6b6b]/15 text-[#ff6b6b] border border-[#ff6b6b]/40'
                      : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                      Follow
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Songs to Remix */}
      <section aria-label="Songs to Remix">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Songs to Remix</h2>
            <p className="text-xs text-white/45">
              Put your own spin on open stems and community prompts
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-white/40">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {remixableSongs.map((song) => {
            const active = currentSong?.id === song.id;
            return (
              <div
                key={`remix-${song.id}`}
                className="group rounded-2xl border border-white/10 bg-[#141418] p-3 flex flex-col transition-all hover:border-white/25 hover:bg-[#19191f]"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-2.5">
                  <CoverThumb song={song} />
                  <button
                    type="button"
                    onClick={() => handlePlaySong(song, remixableSongs)}
                    aria-label={
                      active && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`
                    }
                    className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <span className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                      {active && isPlaying ? (
                        <Pause className="w-4 h-4 fill-black" aria-hidden="true" />
                      ) : (
                        <Play className="w-4 h-4 fill-black ml-0.5" aria-hidden="true" />
                      )}
                    </span>
                  </button>
                </div>
                <h3 className="text-sm font-semibold text-white truncate">{song.title}</h3>
                <p className="text-[11px] text-white/45 truncate mt-0.5 flex-1">
                  {song.style}
                </p>
                <button
                  type="button"
                  onClick={() => handleRemixSong(song)}
                  aria-label={`Open ${song.title} in Studio to remix`}
                  className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#ff6b6b]/15 hover:bg-[#ff6b6b]/25 border border-[#ff6b6b]/30 py-1.5 px-2.5 text-xs font-semibold text-[#ff6b6b] transition-colors"
                >
                  <Repeat2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Remix in Studio
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
