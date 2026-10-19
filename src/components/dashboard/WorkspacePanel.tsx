import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Archive,
  ArchiveRestore,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useUiStore } from '@/store/uiStore';
import { formatRelative } from '@/lib/format';
import type { Project } from '@/lib/types';

/** Deterministic vibrant cover gradient per project, inspired by Suno's workspace tiles. */
function tint(id: string): string {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  const hue2 = (hue + 55) % 360;
  const hue3 = (hue + 140) % 360;
  return `radial-gradient(circle at 25% 25%, hsl(${hue} 85% 62%), transparent 60%), radial-gradient(circle at 80% 80%, hsl(${hue2} 80% 52%), hsl(${hue3} 65% 32%))`;
}

export default function WorkspacePanel() {
  const { projects, load, rename, remove } = useProjectStore();
  const projectId = useLibraryStore((state) => state.projectId);
  const setQuery = useLibraryStore((state) => state.setQuery);
  const stats = useLibraryStore((state) => state.stats);
  const create = useProjectStore((state) => state.create);
  const archivedProjects = useUiStore((state) => state.archivedProjects);
  const toggleArchiveProject = useUiStore((state) => state.toggleArchiveProject);

  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((item) => {
      const isArchived = archivedProjects.includes(item.id);
      if (showArchived !== isArchived) return false;
      return term ? item.title.toLowerCase().includes(term) : true;
    });
  }, [projects, search, showArchived, archivedProjects]);

  const submitNew = async () => {
    if (!draft.trim()) {
      setCreating(false);
      return;
    }
    const project = await create(draft);
    setDraft('');
    setCreating(false);
    if (project) toast.success(`Created “${project.title}”`);
  };

  const submitRename = async (id: string) => {
    if (renameDraft.trim()) {
      try {
        await rename(id, renameDraft);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not rename that project.');
      }
    }
    setRenamingId(null);
  };

  return (
    <div data-tour="projects" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search projects"
            placeholder="Search workspaces…"
            className="pl-9 h-9 rounded-full bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          aria-pressed={showArchived}
          className={`h-9 rounded-full border-white/10 text-xs shrink-0 ${
            showArchived
              ? 'bg-white/15 text-white border-white/25'
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Archive className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
          Archived
          {archivedProjects.length > 0 && (
            <span className="ml-1 text-[10px] text-white/45">({archivedProjects.length})</span>
          )}
        </Button>
      </div>

      {creating ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitNew();
          }}
        >
          <Input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void submitNew()}
            aria-label="New project name"
            placeholder="Project name"
            className="bg-white/5 border-white/10 text-white"
          />
        </form>
      ) : (
        <Button
          variant="outline"
          onClick={() => setCreating(true)}
          className="justify-start h-12 rounded-xl border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.07] hover:text-white px-3"
        >
          <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mr-3 shrink-0">
            <FolderPlus className="w-4 h-4 text-white/70" aria-hidden="true" />
          </span>
          Create new project
        </Button>
      )}

      <nav
        aria-label="Projects"
        className="space-y-1 max-h-[540px] soft-edge-fade-y pr-1"
      >
        {!showArchived && (
          <button
            type="button"
            onClick={() => setQuery({ projectId: null })}
            aria-current={!projectId ? 'true' : undefined}
            className={`w-full flex items-center gap-3 rounded-xl p-2 text-left transition-colors ${
              !projectId ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5'
            }`}
          >
            <span
              aria-hidden="true"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 20%, #f43f5e, transparent 60%), radial-gradient(circle at 80% 80%, #10b981, #7c2d12)',
              }}
              className="w-10 h-10 rounded-lg shrink-0 shadow-inner"
            />
            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm font-medium truncate ${
                  !projectId ? 'text-[#ff8e8e]' : 'text-white'
                }`}
              >
                My Workspace (All songs)
              </span>
              <span className="block text-xs text-white/40">
                {stats?.song_count ?? 0} {stats?.song_count === 1 ? 'song' : 'songs'} · Active
                workspace
              </span>
            </span>
          </button>
        )}

        {visible.map((project) =>
          renamingId === project.id ? (
            <form
              key={project.id}
              onSubmit={(event) => {
                event.preventDefault();
                void submitRename(project.id);
              }}
            >
              <Input
                autoFocus
                value={renameDraft}
                onChange={(event) => setRenameDraft(event.target.value)}
                onBlur={() => void submitRename(project.id)}
                aria-label={`Rename ${project.title}`}
                className="bg-white/5 border-white/10 text-white text-sm"
              />
            </form>
          ) : (
            <div key={project.id} className="group relative">
              <button
                type="button"
                onClick={() => setQuery({ projectId: project.id })}
                aria-current={projectId === project.id ? 'true' : undefined}
                className={`w-full flex items-center gap-3 rounded-xl p-2 pr-9 text-left transition-colors ${
                  projectId === project.id
                    ? 'bg-white/10 border border-white/10'
                    : 'hover:bg-white/5'
                }`}
              >
                <span
                  aria-hidden="true"
                  style={{ backgroundImage: tint(project.id) }}
                  className="w-10 h-10 rounded-lg shrink-0 shadow-inner"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-medium truncate ${
                      projectId === project.id ? 'text-[#ff8e8e]' : 'text-white'
                    }`}
                  >
                    {project.title}
                  </span>
                  <span className="block text-xs text-white/40">
                    {project.song_count} {project.song_count === 1 ? 'song' : 'songs'} ·{' '}
                    {formatRelative(project.updated_at)}
                  </span>
                </span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Actions for ${project.title}`}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-white/40 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#0a0a0a] border-white/10 text-white"
                >
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      setRenameDraft(project.title);
                      setRenamingId(project.id);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" aria-hidden="true" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      toggleArchiveProject(project.id);
                      toast.success(
                        archivedProjects.includes(project.id)
                          ? `Restored “${project.title}”`
                          : `Archived “${project.title}”`,
                      );
                    }}
                  >
                    {archivedProjects.includes(project.id) ? (
                      <>
                        <ArchiveRestore className="w-4 h-4 mr-2" aria-hidden="true" /> Unarchive
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4 mr-2" aria-hidden="true" /> Archive
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-[#ff6b6b] focus:text-[#ff6b6b]"
                    onClick={() => setProjectToDelete(project)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        )}

        {showArchived && !visible.length && (
          <p className="px-2 py-6 text-center text-xs text-white/40">No archived workspaces.</p>
        )}

        {search && !visible.length && !showArchived && (
          <p className="px-2 py-6 text-center text-sm text-white/40">
            No projects match “{search}”.
          </p>
        )}
      </nav>

      <AlertDialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
      >
        <AlertDialogContent className="bg-[#0a0a0a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{projectToDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Its {projectToDelete?.song_count ?? 0} song(s) will stay safely in your library, unfiled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Keep it
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!projectToDelete) return;
                try {
                  await remove(projectToDelete.id);
                  toast.success('Project deleted. Songs kept.');
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Could not delete that project.');
                } finally {
                  setProjectToDelete(null);
                }
              }}
              className="bg-[#ff6b6b] text-black hover:bg-[#ff8e8e]"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
