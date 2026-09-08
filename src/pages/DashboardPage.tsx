import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Clock,
  Download,
  Heart,
  Globe,
  Link2,
  Lock,
  Loader2,
  Milestone,
  MoreVertical,
  Music,
  Play,
  Search,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { formatCount, formatDuration, formatRelative } from '@/lib/format';
import { copyShareLink, downloadSong } from '@/lib/download';
import type { Song, SongVisibility } from '@/lib/types';
import CreateStudio from '@/components/studio/CreateStudio';

const VISIBILITY_ICON: Record<SongVisibility, typeof Lock> = {
  private: Lock,
  unlisted: Link2,
  public: Globe,
};

export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const {
    mySongs,
    publicSongs,
    loadingMine,
    loadingPublic,
    loadMySongs,
    loadPublicSongs,
    toggleLike,
    removeSong,
    changeVisibility,
  } = useLibraryStore();
  const play = usePlayerStore((s) => s.play);
  const currentSong = usePlayerStore((s) => s.currentSong);

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'library' | 'discover'>('library');
  const [pendingDelete, setPendingDelete] = useState<Song | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('tab') === 'discover') setTab('discover');
  }, [searchParams]);

  useEffect(() => {
    void loadMySongs();
    void loadPublicSongs();
  }, [loadMySongs, loadPublicSongs]);

  // Debounced server-side search: the library can outgrow one page.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === 'library') void loadMySongs(search);
      else void loadPublicSongs(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, tab, loadMySongs, loadPublicSongs]);

  const songs = tab === 'library' ? mySongs : publicSongs;
  const loading = tab === 'library' ? loadingMine : loadingPublic;

  const stats = useMemo(
    () => ({
      songs: mySongs.length,
      plays: mySongs.reduce((total, s) => total + s.play_count, 0),
      likes: mySongs.reduce((total, s) => total + s.like_count, 0),
    }),
    [mySongs],
  );

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await removeSong(pendingDelete.id);
      toast.success(`Deleted "${pendingDelete.title}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete that song.');
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-28 pb-32">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/billing"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[#ff6b6b]" aria-hidden="true" />
            <span className="text-sm">{profile?.credit_balance ?? 0} credits</span>
          </Link>
        </div>
      </div>

      <CreateStudio />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Music} label="Total songs" value={String(stats.songs)} />
        <StatCard icon={Play} label="Total plays" value={formatCount(stats.plays)} />
        <StatCard icon={Heart} label="Total likes" value={formatCount(stats.likes)} />
        <StatCard icon={Clock} label="Plan" value={profile?.plan_id ?? 'free'} capitalize />
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'library' | 'discover')}>
          <TabsList className="bg-white/5">
            <TabsTrigger
              value="library"
              className="data-[state=active]:bg-[#ff6b6b] data-[state=active]:text-black"
            >
              My Library
            </TabsTrigger>
            <TabsTrigger
              value="discover"
              className="data-[state=active]:bg-[#ff6b6b] data-[state=active]:text-black"
            >
              Discover
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search songs"
            placeholder="Search songs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
      </div>

      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <caption className="sr-only">
              {tab === 'library' ? 'Songs you have generated' : 'Public songs from the community'}
            </caption>
            <thead className="bg-white/5">
              <tr className="text-left text-white/50 text-sm">
                <th scope="col" className="px-4 py-3 font-medium w-12">
                  #
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Title
                </th>
                <th scope="col" className="px-4 py-3 font-medium hidden md:table-cell">
                  Plays
                </th>
                <th scope="col" className="px-4 py-3 font-medium hidden md:table-cell">
                  Likes
                </th>
                <th scope="col" className="px-4 py-3 font-medium hidden lg:table-cell">
                  Created
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Length
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                !songs.length &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <Skeleton className="h-10 w-full bg-white/5" />
                    </td>
                  </tr>
                ))}

              {songs.map((song, index) => {
                const VisibilityIcon = VISIBILITY_ICON[song.visibility];
                const isCurrent = currentSong?.id === song.id;

                return (
                  <tr
                    key={song.id}
                    tabIndex={0}
                    aria-label={`Play ${song.title} by ${song.artist ?? 'unknown artist'}`}
                    className="group hover:bg-white/5 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6b6b] transition-colors cursor-pointer"
                    onClick={() => void play(song, songs)}
                    onKeyDown={(e) => {
                      // Rows are interactive, so they answer to the keyboard too.
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        void play(song, songs);
                      }
                    }}
                  >
                    <td className="px-4 py-3 text-white/50">
                      <span className="group-hover:hidden">{index + 1}</span>
                      <Play
                        className="w-4 h-4 text-white hidden group-hover:block"
                        fill="currentColor"
                        aria-hidden="true"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={song.cover_url ?? '/images/song-1.jpg'}
                          alt=""
                          loading="lazy"
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p
                            className={`font-medium truncate ${isCurrent ? 'text-[#ff6b6b]' : 'text-white'}`}
                          >
                            {song.title}
                          </p>
                          <p className="text-white/50 text-sm truncate flex items-center gap-1.5">
                            {tab === 'library' && (
                              <VisibilityIcon className="w-3 h-3" aria-label={song.visibility} />
                            )}
                            {song.artist}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/50 hidden md:table-cell">
                      {formatCount(song.play_count)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleLike(song.id);
                        }}
                        aria-pressed={Boolean(song.is_liked)}
                        aria-label={song.is_liked ? `Unlike ${song.title}` : `Like ${song.title}`}
                        className={`flex items-center gap-1 rounded px-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6b6b] ${song.is_liked ? 'text-[#ff6b6b]' : 'text-white/50'} hover:text-[#ff6b6b]`}
                      >
                        <Heart
                          className="w-4 h-4"
                          fill={song.is_liked ? 'currentColor' : 'none'}
                          aria-hidden="true"
                        />
                        {formatCount(song.like_count)}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-white/50 hidden lg:table-cell">
                      {formatRelative(song.created_at)}
                    </td>
                    <td className="px-4 py-3 text-white/50">
                      {formatDuration(song.duration_seconds)}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`More actions for ${song.title}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6b6b]"
                          >
                            <MoreVertical className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#0a0a0a] border-white/10 text-white"
                        >
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              void copyShareLink(song.id);
                            }}
                            className="cursor-pointer"
                          >
                            <Share2 className="w-4 h-4 mr-2" aria-hidden="true" /> Copy link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              void downloadSong(song.id, song.title);
                            }}
                            className="cursor-pointer"
                          >
                            <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Download
                          </DropdownMenuItem>

                          {tab === 'library' && (
                            <>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuLabel className="text-white/40 text-xs">
                                Sharing
                              </DropdownMenuLabel>
                              <DropdownMenuRadioGroup
                                value={song.visibility}
                                onValueChange={(value) => {
                                  void changeVisibility(song.id, value as SongVisibility)
                                    .then(() => toast.success(`"${song.title}" is now ${value}`))
                                    .catch((err) => toast.error(err.message));
                                }}
                              >
                                <DropdownMenuRadioItem value="private" className="cursor-pointer">
                                  Private
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="unlisted" className="cursor-pointer">
                                  Unlisted
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="public" className="cursor-pointer">
                                  Public
                                </DropdownMenuRadioItem>
                              </DropdownMenuRadioGroup>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingDelete(song);
                                }}
                                className="cursor-pointer text-[#ff6b6b] focus:text-[#ff6b6b]"
                              >
                                <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && !songs.length && (
          <div className="text-center py-16 px-6">
            {tab === 'library' ? (
              <>
                <Milestone className="w-10 h-10 text-white/20 mx-auto mb-4" aria-hidden="true" />
                <p className="text-white/70 mb-1">No songs yet</p>
                <p className="text-white/40 text-sm mb-6">
                  {search
                    ? 'Nothing matched that search.'
                    : 'Describe a song on the home page and Jamz will make it.'}
                </p>
                {!search && (
                  <Button asChild className="gradient-coral text-black font-semibold">
                    <Link to="/">Create your first song</Link>
                  </Button>
                )}
              </>
            ) : (
              <>
                <Music className="w-10 h-10 text-white/20 mx-auto mb-4" aria-hidden="true" />
                <p className="text-white/50">No public songs to show yet.</p>
              </>
            )}
          </div>
        )}

        {loading && songs.length > 0 && (
          <div className="flex items-center justify-center py-3 text-white/40 text-sm gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Updating…
          </div>
        )}
      </div>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent className="bg-[#0a0a0a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.title}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This removes the song from your library and any link you have shared. It cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Keep it
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[#ff6b6b] text-black hover:bg-[#ff8e8e]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  capitalize,
}: {
  icon: typeof Music;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="bg-white/5 rounded-xl p-5 border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[#ff6b6b]" aria-hidden="true" />
        <span className="text-white/50 text-sm">{label}</span>
      </div>
      <p className={`text-2xl md:text-3xl font-bold text-white ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </p>
    </div>
  );
}
