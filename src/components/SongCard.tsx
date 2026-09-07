import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Pause, Play } from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useAuthStore } from '@/store/authStore';
import { formatCount } from '@/lib/format';
import type { Song } from '@/lib/types';

interface SongCardProps {
  song: Song;
  /** Playing from a card sets the surrounding list as the queue. */
  queue: Song[];
  aspect?: 'square' | 'portrait';
  style?: CSSProperties;
  className?: string;
}

/**
 * The single card used by the hero grid and the showcase. Both used to carry
 * their own hard-coded song arrays, which drifted apart from each other and
 * from the store.
 */
export default function SongCard({
  song,
  queue,
  aspect = 'square',
  style,
  className = '',
}: SongCardProps) {
  const play = usePlayerStore((s) => s.play);
  const toggle = usePlayerStore((s) => s.toggle);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const session = useAuthStore((s) => s.session);

  const isCurrent = currentSong?.id === song.id;
  const showPause = isCurrent && isPlaying;

  return (
    <div
      className={`group relative rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-colors ${className}`}
      style={style}
    >
      <div
        className={`${aspect === 'portrait' ? 'aspect-[3/4]' : 'aspect-square'} relative overflow-hidden`}
      >
        <img
          src={song.cover_url ?? '/images/song-1.jpg'}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        <button
          type="button"
          onClick={() => (isCurrent ? toggle() : void play(song, queue))}
          aria-label={showPause ? `Pause ${song.title}` : `Play ${song.title}`}
          className="absolute inset-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b6b] focus-visible:ring-inset"
        >
          <span
            className={`w-12 h-12 rounded-full gradient-coral flex items-center justify-center transition-all duration-300 ${
              showPause
                ? 'scale-100 opacity-100'
                : 'scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100'
            }`}
          >
            {showPause ? (
              <Pause className="w-5 h-5 text-black" fill="currentColor" aria-hidden="true" />
            ) : (
              <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" aria-hidden="true" />
            )}
          </span>
        </button>
      </div>

      <div className={aspect === 'portrait' ? 'absolute bottom-0 left-0 right-0 p-4' : 'p-4'}>
        <Link
          to={`/song/${song.id}`}
          className={`block font-semibold truncate hover:underline rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6b6b] ${
            isCurrent ? 'text-[#ff6b6b]' : 'text-white'
          } ${aspect === 'portrait' ? 'text-sm' : 'text-base mb-1'}`}
        >
          {song.title}
        </Link>
        <p className="text-white/60 text-xs truncate">{song.artist}</p>

        <div className="flex items-center justify-between gap-3 mt-2 text-xs text-white/50">
          <span>{formatCount(song.play_count)} plays</span>
          <button
            type="button"
            onClick={() => (session ? void toggleLike(song.id) : undefined)}
            disabled={!session}
            aria-pressed={Boolean(song.is_liked)}
            aria-label={song.is_liked ? `Unlike ${song.title}` : `Like ${song.title}`}
            className={`flex items-center gap-1 rounded px-1 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6b6b] ${
              song.is_liked ? 'text-[#ff6b6b]' : 'hover:text-[#ff6b6b] disabled:hover:text-white/50'
            }`}
          >
            <Heart
              className="w-3.5 h-3.5"
              fill={song.is_liked ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
            {formatCount(song.like_count)}
          </button>
        </div>
      </div>
    </div>
  );
}
