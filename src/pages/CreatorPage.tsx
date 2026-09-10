import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Music } from 'lucide-react';
import SongCard from '@/components/SongCard';
import EmptyState from '@/components/onboarding/EmptyState';
import NotFoundPage from './NotFoundPage';
import { fetchCreator, fetchCreatorSongs, type CreatorProfile } from '@/lib/api';
import { formatCount, formatDate } from '@/lib/format';
import type { Song } from '@/lib/types';

/** A creator's public page. Only public songs appear here, for anyone. */
export default function CreatorPage() {
  const { handle } = useParams<{ handle: string }>();
  const [state, setState] = useState<{
    handle: string;
    creator: CreatorProfile | null;
    songs: Song[];
  } | null>(null);

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;

    void Promise.all([fetchCreator(handle), fetchCreatorSongs(handle)])
      .then(([creator, songs]) => {
        if (!cancelled) setState({ handle, creator, songs });
      })
      .catch(() => {
        if (!cancelled) setState({ handle, creator: null, songs: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [handle]);

  const loading = state?.handle !== handle;

  if (loading) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        <span className="sr-only">Loading profile…</span>
      </div>
    );
  }

  if (!state?.creator) return <NotFoundPage />;

  const { creator, songs } = state;

  return (
    <div className="mx-auto max-w-5xl px-6 pt-28 pb-32">
      <header className="flex flex-wrap items-center gap-5 mb-10">
        <span
          aria-hidden="true"
          className="flex h-20 w-20 items-center justify-center rounded-2xl gradient-coral text-3xl font-bold text-black"
        >
          {(creator.display_name || creator.handle).charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{creator.display_name || creator.handle}</h1>
          <p className="text-white/40 text-sm">@{creator.handle}</p>
          {creator.bio && <p className="text-white/60 mt-2 max-w-xl">{creator.bio}</p>}
          <dl className="mt-3 flex flex-wrap gap-5 text-sm">
            <div className="flex gap-1.5">
              <dt className="text-white/40">Songs</dt>
              <dd className="text-white">{creator.song_count}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-white/40">Plays</dt>
              <dd className="text-white">{formatCount(creator.play_total)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-white/40">Likes</dt>
              <dd className="text-white">{formatCount(creator.like_total)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-white/40">Joined</dt>
              <dd className="text-white">{formatDate(creator.created_at)}</dd>
            </div>
          </dl>
        </div>
      </header>

      {songs.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} queue={songs} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Music}
          title="Nothing public yet"
          description={`${creator.display_name || creator.handle} has not published any songs.`}
        />
      )}
    </div>
  );
}
