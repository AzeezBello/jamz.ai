import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Pause, Play, Heart, Share2, Download, Globe, Link2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotFoundPage from './NotFoundPage';
import { fetchSong } from '@/lib/api';
import { copyShareLink, downloadSong } from '@/lib/download';
import { formatCount, formatDate, formatDuration } from '@/lib/format';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useAuthStore } from '@/store/authStore';
import type { Song } from '@/lib/types';

const VISIBILITY_LABEL = {
  public: { icon: Globe, text: 'Public' },
  unlisted: { icon: Link2, text: 'Unlisted' },
  private: { icon: Lock, text: 'Private' },
} as const;

/**
 * The destination for every share link. Public and unlisted songs render for
 * signed-out visitors; RLS returns nothing for private songs, which falls
 * through to the 404 below.
 */
function isCurrentSong(currentSong: Song | null, song: Song): boolean {
  return currentSong?.id === song.id;
}

export default function SongPage() {
  const { id } = useParams<{ id: string }>();
  // One piece of state tagged with the id it describes, so a route change
  // reads as "loading" by derivation instead of a setState inside an effect.
  const [result, setResult] = useState<{ id: string; song: Song | null } | null>(null);

  const session = useAuthStore((s) => s.session);
  const play = usePlayerStore((s) => s.play);
  const toggle = usePlayerStore((s) => s.toggle);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    void fetchSong(id)
      .then((found) => {
        if (!cancelled) setResult({ id, song: found });
      })
      .catch(() => {
        if (!cancelled) setResult({ id, song: null });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const loading = result?.id !== id;
  const fetched = loading ? null : (result?.song ?? null);

  // The player bar owns like state for whatever is playing; mirror it here
  // during render rather than copying it into state.
  const song =
    fetched && isCurrentSong(currentSong, fetched)
      ? { ...fetched, like_count: currentSong!.like_count, is_liked: currentSong!.is_liked }
      : fetched;

  if (loading) {
    return (
      <div
        className="min-h-[70vh] flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        <span className="sr-only">Loading song…</span>
      </div>
    );
  }

  if (!song) return <NotFoundPage />;

  const isCurrent = currentSong?.id === song.id;
  const Visibility = VISIBILITY_LABEL[song.visibility];

  return (
    <article className="max-w-4xl mx-auto px-6 pt-28 pb-32">
      <div className="flex flex-col md:flex-row gap-8">
        <img
          src={song.cover_url ?? '/images/song-1.jpg'}
          alt={`Cover art for ${song.title}`}
          className="w-full md:w-64 h-64 rounded-2xl object-cover border border-white/10"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
            <Visibility.icon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{Visibility.text}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(song.created_at)}</span>
            {song.commercial_use && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#ff6b6b]">Commercial use</span>
              </>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-2 break-words">{song.title}</h1>
          <p className="text-white/60 mb-4">{song.artist}</p>

          {song.prompt && (
            <p className="text-white/40 text-sm italic mb-6 max-w-xl">"{song.prompt}"</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button
              onClick={() => (isCurrent ? toggle() : void play(song, [song]))}
              className="gradient-coral text-black font-semibold px-6"
            >
              {isCurrent && isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" fill="currentColor" aria-hidden="true" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" fill="currentColor" aria-hidden="true" /> Play
                </>
              )}
            </Button>

            {session && (
              <Button
                variant="outline"
                onClick={() => void toggleLike(song.id)}
                aria-pressed={Boolean(song.is_liked)}
                className={`border-white/20 hover:bg-white/10 ${song.is_liked ? 'text-[#ff6b6b]' : 'text-white'}`}
              >
                <Heart
                  className="w-4 h-4 mr-2"
                  fill={song.is_liked ? 'currentColor' : 'none'}
                  aria-hidden="true"
                />
                {formatCount(song.like_count)}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => void copyShareLink(song.id)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Share2 className="w-4 h-4 mr-2" aria-hidden="true" /> Share
            </Button>

            <Button
              variant="outline"
              onClick={() => void downloadSong(song.id, song.title)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Download
            </Button>
          </div>

          <dl className="grid grid-cols-3 gap-4 text-sm max-w-sm">
            <div>
              <dt className="text-white/40">Plays</dt>
              <dd className="text-white font-medium">{formatCount(song.play_count)}</dd>
            </div>
            <div>
              <dt className="text-white/40">Length</dt>
              <dd className="text-white font-medium">{formatDuration(song.duration_seconds)}</dd>
            </div>
            <div>
              <dt className="text-white/40">Model</dt>
              <dd className="text-white font-medium">{song.model_version || '—'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}
