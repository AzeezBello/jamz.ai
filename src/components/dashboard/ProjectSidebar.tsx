import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FolderPlus, Library, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useLibraryStore } from '@/store/libraryStore';

export default function ProjectSidebar() {
  const { projects, load, create, rename, remove } = useProjectStore();
  const projectId = useLibraryStore((state) => state.projectId);
  const setQuery = useLibraryStore((state) => state.setQuery);
  const stats = useLibraryStore((state) => state.stats);

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => {
    void load();
  }, [load]);

  const submitNew = async () => {
    if (!draft.trim()) {
      setCreating(false);
      return;
    }
    const project = await create(draft);
    setDraft('');
    setCreating(false);
    if (project) toast.success(`Created "${project.title}"`);
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

  const itemClass = (active: boolean) =>
    `w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6b6b] ${
      active ? 'bg-[#ff6b6b]/15 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <nav aria-label="Projects" className="space-y-1">
      <button
        type="button"
        onClick={() => setQuery({ projectId: null })}
        className={itemClass(!projectId)}
      >
        <Library className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">All songs</span>
        <span className="text-xs text-white/30">{stats?.song_count ?? 0}</span>
      </button>

      {projects.map((project) =>
        renamingId === project.id ? (
          <form
            key={project.id}
            onSubmit={(event) => {
              event.preventDefault();
              void submitRename(project.id);
            }}
            className="px-1"
          >
            <Input
              autoFocus
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
              onBlur={() => void submitRename(project.id)}
              aria-label={`Rename ${project.title}`}
              className="h-8 bg-white/5 border-white/10 text-white text-sm"
            />
          </form>
        ) : (
          <div key={project.id} className="group flex items-center gap-1">
            <button
              type="button"
              onClick={() => setQuery({ projectId: project.id })}
              className={itemClass(projectId === project.id)}
            >
              <span className="w-4 shrink-0 text-center text-white/30" aria-hidden="true">
                ▸
              </span>
              <span className="flex-1 truncate">{project.title}</span>
              <span className="text-xs text-white/30">{project.song_count}</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Actions for ${project.title}`}
                  className="h-7 w-7 shrink-0 text-white/40 opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-white/10 text-white">
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
                  className="cursor-pointer text-[#ff6b6b] focus:text-[#ff6b6b]"
                  onClick={() => {
                    // Songs are unfiled, not deleted — say so, because "delete
                    // folder" usually implies losing the contents.
                    if (
                      window.confirm(
                        `Delete "${project.title}"? Its ${project.song_count} song(s) stay in your library.`,
                      )
                    ) {
                      void remove(project.id)
                        .then(() => toast.success('Project deleted. Songs kept.'))
                        .catch((err) => toast.error(err.message));
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      )}

      {creating ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitNew();
          }}
          className="px-1 pt-1"
        >
          <Input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void submitNew()}
            placeholder="Project name"
            aria-label="New project name"
            className="h-8 bg-white/5 border-white/10 text-white text-sm"
          />
        </form>
      ) : (
        <Button
          variant="ghost"
          onClick={() => setCreating(true)}
          className="w-full justify-start text-white/50 hover:text-white text-sm px-3"
        >
          <FolderPlus className="w-4 h-4 mr-2" aria-hidden="true" /> New project
        </Button>
      )}
    </nav>
  );
}
