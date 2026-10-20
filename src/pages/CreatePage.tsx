import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Music } from 'lucide-react';
import CreateStudio from '@/components/studio/CreateStudio';
import WorkspacePanel from '@/components/dashboard/WorkspacePanel';
import GenerationActivity from '@/components/dashboard/GenerationActivity';
import BulkActionBar from '@/components/dashboard/BulkActionBar';
import SongTable from '@/components/dashboard/SongTable';
import EditSongDialog from '@/components/dashboard/EditSongDialog';
import { useLibraryStore } from '@/store/libraryStore';
import { useProjectStore } from '@/store/projectStore';
import type { Song } from '@/lib/types';

export default function CreatePage() {
  const {
    mySongs,
    loadingMine,
    projectId,
    loadMySongs,
    loadStats,
    removeSong,
  } = useLibraryStore();
  const projects = useProjectStore((state) => state.projects);

  const [pendingDelete, setPendingDelete] = useState<Song | null>(null);
  const [editing, setEditing] = useState<Song | null>(null);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadMySongs();
  }, [projectId, loadMySongs]);

  const activeProject = projectId ? projects.find((p) => p.id === projectId) : null;

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
    <div className="max-w-[1400px] mx-auto px-6 pt-8 pb-32">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)] items-start">
        <CreateStudio />

        <div className="min-w-0 space-y-6">
          <div>
            <h2 className="text-sm font-medium text-white/50 mb-3">Projects</h2>
            <WorkspacePanel />
          </div>

          <GenerationActivity />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-white/70">
                  {activeProject ? `${activeProject.title} Songs` : 'Recent Workspace Songs'}
                </h2>
                <p className="text-xs text-white/40">
                  {activeProject
                    ? 'Tracks filed in this project workspace'
                    : 'Showing your latest creations across all workspaces'}
                </p>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff6b6b] hover:text-[#ff8e8e] transition-colors"
              >
                Open full library
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>

            <BulkActionBar songs={mySongs} />

            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              {loadingMine && !mySongs.length ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full bg-white/5" />
                  ))}
                </div>
              ) : mySongs.length ? (
                <SongTable
                  songs={mySongs.slice(0, 12)}
                  owned
                  onEdit={setEditing}
                  onDelete={setPendingDelete}
                />
              ) : (
                <div className="p-10 text-center">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                    <Music className="w-5 h-5 text-white/40" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {activeProject
                      ? `No songs in "${activeProject.title}" yet`
                      : 'Ready for your first track'}
                  </h3>
                  <p className="text-xs text-white/45 mt-1 max-w-sm mx-auto">
                    Configure your prompt, lyrics, and style on the left and press Create to
                    generate a song in about a minute.
                  </p>
                </div>
              )}
            </div>
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
