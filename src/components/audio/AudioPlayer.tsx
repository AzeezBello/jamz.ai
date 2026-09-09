import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import IconButton from '@/components/ui/icon-button';
import { Slider } from '@/components/ui/slider';
import {
  AlertCircle,
  Download,
  Heart,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useAuthStore } from '@/store/authStore';
import { copyShareLink, downloadSong } from '@/lib/download';
import { formatDuration } from '@/lib/format';

/**
 * Bound to the real <audio> element: the progress bar reflects decoded time,
 * seeking moves the element, and volume/mute change what you actually hear.
 */
export default function AudioPlayer() {
  const {
    currentSong,
    queue,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    muted,
    error,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    setMuted,
    play,
    stop,
  } = usePlayerStore();

  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const session = useAuthStore((s) => s.session);
  const [showQueue, setShowQueue] = useState(false);

  if (!currentSong) return null;

  // Prefer the decoded duration; fall back to the stored length until metadata
  // arrives so the bar isn't stuck at zero.
  const total = duration || currentSong.duration_seconds || 0;
  const progress = total > 0 ? Math.min((currentTime / total) * 100, 100) : 0;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/10">
        <div className="relative h-1 bg-white/10 group">
          <div
            className="h-full gradient-coral relative pointer-events-none"
            style={{ width: `${progress}%` }}
          >
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <Slider
            value={[progress]}
            onValueChange={([value]) => seek((value / 100) * total)}
            max={100}
            step={0.1}
            aria-label="Seek"
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>

        {error && (
          <p className="px-4 py-1 text-xs text-[#ff6b6b] flex items-center gap-1.5" role="alert">
            <AlertCircle className="w-3 h-3" aria-hidden="true" /> {error}
          </p>
        )}

        <div className="max-w-[1400px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src={currentSong.cover_url ?? '/images/song-1.jpg'}
                alt=""
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <Link
                  to={`/song/${currentSong.id}`}
                  className="text-white font-medium text-sm truncate block hover:underline"
                >
                  {currentSong.title}
                </Link>
                <p className="text-white/50 text-xs truncate">{currentSong.artist}</p>
              </div>
              {session && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void toggleLike(currentSong.id)}
                  aria-label={currentSong.is_liked ? 'Unlike this song' : 'Like this song'}
                  aria-pressed={Boolean(currentSong.is_liked)}
                  className={`${currentSong.is_liked ? 'text-[#ff6b6b]' : 'text-white/50'} hover:text-[#ff6b6b]`}
                >
                  <Heart
                    className="w-4 h-4"
                    fill={currentSong.is_liked ? 'currentColor' : 'none'}
                    aria-hidden="true"
                  />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={previous}
                disabled={queue.length < 2 && currentTime < 3}
                aria-label="Previous track"
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <SkipBack className="w-5 h-5" aria-hidden="true" />
              </Button>

              <Button
                onClick={toggle}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="w-10 h-10 rounded-full gradient-coral text-black hover:opacity-90 flex items-center justify-center"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5" fill="currentColor" aria-hidden="true" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" fill="currentColor" aria-hidden="true" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={next}
                disabled={queue.length < 2}
                aria-label="Next track"
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <SkipForward className="w-5 h-5" aria-hidden="true" />
              </Button>
            </div>

            <div className="flex items-center gap-3 flex-1 justify-end">
              <span className="text-white/50 text-xs hidden sm:inline tabular-nums">
                {formatDuration(currentTime)} / {formatDuration(total)}
              </span>

              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMuted(!muted)}
                  aria-label={muted ? 'Unmute' : 'Mute'}
                  aria-pressed={muted}
                  className="text-white/50 hover:text-white hover:bg-white/10"
                >
                  {muted ? (
                    <VolumeX className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Volume2 className="w-4 h-4" aria-hidden="true" />
                  )}
                </Button>
                <Slider
                  value={[muted ? 0 : volume * 100]}
                  onValueChange={([value]) => setVolume(value / 100)}
                  max={100}
                  step={1}
                  aria-label="Volume"
                  className="w-20"
                />
              </div>

              <div className="flex items-center gap-1">
                <IconButton
                  variant="ghost"
                  size="icon"
                  onClick={() => void copyShareLink(currentSong.id)}
                  label="Copy share link"
                  className="text-white/50 hover:text-white hover:bg-white/10"
                >
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                </IconButton>
                <IconButton
                  variant="ghost"
                  size="icon"
                  onClick={() => void downloadSong(currentSong.id, currentSong.title)}
                  label="Download this song"
                  className="text-white/50 hover:text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                </IconButton>
                <IconButton
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQueue(!showQueue)}
                  label="Toggle queue"
                  aria-expanded={showQueue}
                  className={`text-white/50 hover:text-white hover:bg-white/10 ${showQueue ? 'text-[#ff6b6b]' : ''}`}
                >
                  <ListMusic className="w-4 h-4" aria-hidden="true" />
                </IconButton>
                <IconButton
                  variant="ghost"
                  size="icon"
                  onClick={stop}
                  label="Close player"
                  className="text-white/50 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showQueue && (
        <aside
          aria-label="Play queue"
          className="fixed bottom-24 right-4 z-50 w-80 max-h-96 overflow-auto glass rounded-xl border border-white/10 p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Queue</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowQueue(false)}
              aria-label="Close queue"
              className="text-white/50 hover:text-white"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
          <ul className="space-y-1">
            {queue.map((song) => (
              <li key={song.id}>
                <button
                  type="button"
                  onClick={() => void play(song, queue)}
                  aria-current={song.id === currentSong.id ? 'true' : undefined}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6b6b] ${
                    song.id === currentSong.id ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <img
                    src={song.cover_url ?? '/images/song-1.jpg'}
                    alt=""
                    className="w-10 h-10 rounded object-cover"
                  />
                  <span className="flex-1 min-w-0">
                    <span
                      className={`block text-sm truncate ${song.id === currentSong.id ? 'text-[#ff6b6b]' : 'text-white'}`}
                    >
                      {song.title}
                    </span>
                    <span className="block text-white/50 text-xs truncate">{song.artist}</span>
                  </span>
                  {song.id === currentSong.id && isPlaying && (
                    <span className="flex gap-0.5" aria-label="Now playing">
                      <span className="w-1 h-4 bg-[#ff6b6b] animate-pulse" />
                      <span
                        className="w-1 h-4 bg-[#ff6b6b] animate-pulse"
                        style={{ animationDelay: '0.1s' }}
                      />
                      <span
                        className="w-1 h-4 bg-[#ff6b6b] animate-pulse"
                        style={{ animationDelay: '0.2s' }}
                      />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </>
  );
}
