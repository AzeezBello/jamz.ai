import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FolderInput, Globe, Loader2, Lock, Trash2, X } from 'lucide-react';
import { useLibraryStore } from '@/store/libraryStore';
import { useProjectStore } from '@/store/projectStore';
import { downloadSong } from '@/lib/download';
import type { Song } from '@/lib/types';

interface BulkActionBarProps {
  songs: Song[];
}

/** Appears only with a selection, so it never competes with the library. */
export default function BulkActionBar({ songs }: BulkActionBarProps) {
  const { selectedIds, clearSelection, bulkDelete, bulkVisibility } = useLibraryStore();
  const projects = useProjectStore((state) => state.projects);
  const moveSongs = useProjectStore((state) => state.moveSongs);
  const [busy, setBusy] = useState(false);

  if (!selectedIds.length) return null;

  const run = async (action: () => Promise<number>, verb: string) => {
    setBusy(true);
    try {
      const count = await action();
      toast.success(`${verb} ${count} song${count === 1 ? '' : 's'}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  };

  const downloadSelected = async () => {
    setBusy(true);
    const chosen = songs.filter((song) => selectedIds.includes(song.id));
    // Sequential: browsers throttle or block a burst of simultaneous downloads.
    for (const song of chosen) await downloadSong(song.id, song.title);
    setBusy(false);
    clearSelection();
  };

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="sticky top-20 z-30 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#ff6b6b]/40 bg-[#1a0d0d]/95 px-4 py-3 backdrop-blur"
    >
      <span className="text-sm text-white mr-1">{selectedIds.length} selected</span>

      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => void run(() => bulkVisibility('public'), 'Published')}
        className="text-white/70 hover:text-white"
      >
        <Globe className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Make public
      </Button>

      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => void run(() => bulkVisibility('private'), 'Made private')}
        className="text-white/70 hover:text-white"
      >
        <Lock className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Make private
      </Button>

      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => void downloadSelected()}
        className="text-white/70 hover:text-white"
      >
        <Download className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Download
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            className="text-white/70 hover:text-white"
          >
            <FolderInput className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Move to
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-[#0a0a0a] border-white/10 text-white">
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              className="cursor-pointer"
              onClick={() =>
                void run(() => moveSongs(selectedIds, project.id), `Moved to ${project.title} —`)
              }
            >
              {project.title}
            </DropdownMenuItem>
          ))}
          {projects.length > 0 && <DropdownMenuSeparator className="bg-white/10" />}
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => void run(() => moveSongs(selectedIds, null), 'Unfiled')}
          >
            No project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => {
          if (window.confirm(`Delete ${selectedIds.length} song(s)? This cannot be undone.`)) {
            void run(bulkDelete, 'Deleted');
          }
        }}
        className="text-[#ff6b6b] hover:text-[#ff8e8e]"
      >
        <Trash2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Delete
      </Button>

      {busy && <Loader2 className="w-4 h-4 animate-spin text-white/50" aria-hidden="true" />}

      <Button
        size="icon"
        variant="ghost"
        onClick={clearSelection}
        aria-label="Clear selection"
        className="ml-auto text-white/50 hover:text-white"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
