import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Compass, Globe, Heart, Loader2, Music, Play, Sparkles, Wand2 } from 'lucide-react';
import EmptyState from '@/components/onboarding/EmptyState';
import { useOnboardingStore } from '@/store/onboardingStore';
import CreateStudio from '@/components/studio/CreateStudio';
import GenerationActivity from '@/components/dashboard/GenerationActivity';
import LibraryToolbar from '@/components/dashboard/LibraryToolbar';
import BulkActionBar from '@/components/dashboard/BulkActionBar';
import SongTable from '@/components/dashboard/SongTable';
import SongCard from '@/components/SongCard';
import ProjectSidebar from '@/components/dashboard/ProjectSidebar';
import EditSongDialog from '@/components/dashboard/EditSongDialog';
import { useAuthStore } from '@/store/authStore';
import { useLibraryStore } from '@/store/libraryStore';
import { formatCount } from '@/lib/format';
import { GENERATION_COST } from '@/lib/credits';
import type { Song } from '@/lib/types';

export default function DashboardPage() {
  const profile = useAuthStore((state) => state.profile);
  const {
    mySongs,
    publicSongs,
    stats,
    loadingMine,
    loadingPublic,
    loadingMore,
    hasMoreMine,
    hasMorePublic,
    search,
    sort,
    visibility,
    setQuery,
    loadMySongs,
    loadPublicSongs,
    loadMoreMine,
    loadMorePublic,
    loadStats,
    removeSong,
    clearSelection,
    projectId,
  } = useLibraryStore();

  const [tab, setTab] = useState<'library' | 'discover'>('library');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [pendingDelete, setPendingDelete] = useState<Song | null>(null);
  const [editing, setEditing] = useState<Song | null>(null);
  const [searchParams] = useSearchParams();
  const openTour = useOnboardingStore((state) => state.openTour);

  useEffect(() => {
    if (searchParams.get('tab') === 'discover') setTab('discover');
  }, [searchParams]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // One debounced effect drives both tabs: search, sort and filter all feed the
  // same server-side query, so the list is never filtered client-side.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === 'library') void loadMySongs();
      else void loadPublicSongs();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, sort, visibility, projectId, tab, loadMySongs, loadPublicSongs]);

  useEffect(() => {
    clearSelection();
  }, [tab, clearSelection]);

  const songs = tab === 'library' ? mySongs : publicSongs;
  const loading = tab === 'library' ? loadingMine : loadingPublic;
  const hasMore = tab === 'library' ? hasMoreMine : hasMorePublic;
  const owned = tab === 'library';

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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={openTour}
            className="text-white/50 hover:text-white text-sm"
          >
            <Compass className="w-4 h-4 mr-2" aria-hidden="true" />
            Take the tour
          </Button>
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
      <GenerationActivity />

      <div data-tour="library-stats" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Music} label="Total songs" value={String(stats?.song_count ?? 0)} />
        <StatCard icon={Play} label="Total plays" value={formatCount(stats?.play_total ?? 0)} />
        <StatCard icon={Heart} label="Total likes" value={formatCount(stats?.like_total ?? 0)} />
        <StatCard icon={Globe} label="Public" value={String(stats?.public_count ?? 0)} />
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6 items-start">
        <aside
          className={`hidden lg:block sticky top-24 ${owned ? '' : 'opacity-40 pointer-events-none'}`}
        >
          <ProjectSidebar />
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <Tabs value={tab} onValueChange={(value) => setTab(value as 'library' | 'discover')}>
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
          </div>

          <div data-tour="library-toolbar">
            <LibraryToolbar
              search={search}
              onSearch={(value) => setQuery({ search: value })}
              sort={sort}
              onSort={(value) => setQuery({ sort: value })}
              visibility={visibility}
              onVisibility={(value) => setQuery({ visibility: value })}
              view={view}
              onView={setView}
              showVisibilityFilter={owned}
            />
          </div>

          {owned && <BulkActionBar songs={mySongs} />}

          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            {loading && !songs.length ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full bg-white/5" />
                ))}
              </div>
            ) : view === 'grid' && songs.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
                {songs.map((song) => (
                  <SongCard key={song.id} song={song} queue={songs} />
                ))}
              </div>
            ) : songs.length ? (
              <SongTable
                songs={songs}
                owned={owned}
                onEdit={setEditing}
                onDelete={setPendingDelete}
              />
            ) : null}

            {!loading && !songs.length && (
              <>
                {owned ? (
                  search || visibility !== 'all' || projectId ? (
                    <EmptyState
                      icon={Music}
                      title="Nothing matches those filters"
                      description="No songs in your library match what you are looking for right now."
                      tips={[
                        'Search looks at titles, prompts and lyrics — try a word from the brief you wrote.',
                        'The visibility filter hides songs: set it back to “All songs” to see everything.',
                        'A project filter only shows songs filed into that project.',
                      ]}
                      action={
                        <Button
                          variant="outline"
                          onClick={() =>
                            setQuery({ search: '', visibility: 'all', projectId: null })
                          }
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          Clear filters
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      icon={Wand2}
                      title="Your library starts with one sentence"
                      description="Describe a song in the studio above and it will appear here in about a minute."
                      tips={[
                        'Mood and story work better than genre alone — “a slow song about leaving a town at dawn”.',
                        'Add your own lyrics, or leave them blank and let the model write the vocal.',
                        `Each song costs ${GENERATION_COST} credits, and you get them back if it fails or you cancel.`,
                        'Songs are private until you choose to share them.',
                      ]}
                      action={
                        <>
                          <Button
                            onClick={() =>
                              document
                                .querySelector('[data-tour="studio"]')
                                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }
                            className="gradient-coral text-black font-semibold"
                          >
                            <Wand2 className="w-4 h-4 mr-2" aria-hidden="true" /> Go to the studio
                          </Button>
                          <Button
                            variant="outline"
                            onClick={openTour}
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            <Compass className="w-4 h-4 mr-2" aria-hidden="true" /> Take the tour
                          </Button>
                        </>
                      }
                    />
                  )
                ) : (
                  <EmptyState
                    icon={Globe}
                    title="Nothing public yet"
                    description="Discover shows songs people have chosen to publish. It is quiet in here for now."
                    tips={[
                      'Publish one of your own: open a song’s menu and set its sharing to Public.',
                      'Unlisted is the middle ground — anyone with the link can listen, but it stays out of Discover.',
                    ]}
                  />
                )}
              </>
            )}

            {hasMore && (
              <div className="border-t border-white/10 p-4 text-center">
                <Button
                  variant="ghost"
                  disabled={loadingMore}
                  onClick={() => void (owned ? loadMoreMine() : loadMorePublic())}
                  className="text-white/70 hover:text-white"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> Loading…
                    </>
                  ) : (
                    'Load more'
                  )}
                </Button>
              </div>
            )}

            {loading && songs.length > 0 && (
              <div className="flex items-center justify-center gap-2 py-3 text-white/40 text-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Updating…
              </div>
            )}
          </div>
        </div>
      </div>

      <EditSongDialog song={editing} onClose={() => setEditing(null)} />

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
}: {
  icon: typeof Music;
  label: string;
  value: string;
}) {
  return (
    // Grouped and labelled so the number is announced with the thing it counts
    // rather than as a bare figure floating next to some text.
    <div
      role="group"
      aria-label={label}
      className="bg-white/5 rounded-xl p-5 border border-white/10"
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[#ff6b6b]" aria-hidden="true" />
        <span className="text-white/50 text-sm">{label}</span>
      </div>
      <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
