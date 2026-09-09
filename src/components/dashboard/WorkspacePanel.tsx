import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FolderPlus, Library, MoreHorizontal, Pencil, Search, Trash2 } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useLibraryStore } from '@/store/libraryStore';
import { formatRelative } from '@/lib/format';

/** Deterministic cover tint per project, so each is recognisable at a glance. */
function tint(id: string): string {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 48) % 360} 72% 46%))`;
}

export default function WorkspacePanel() {
  const { projects, rename, remove } = useProjectStore();
  const projectId = useLibraryStore((state) => state.projectId);
  const setQuery = useLibraryStore((state) => state.setQuery);
  const stats = useLibraryStore((state) => state.stats);
  const create = useProjectStore((state) => state.create);

  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? projects.filter((item) => item.title.toLowerCase().includes(term)) : projects;
  }, [projects, search]);

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
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search projects"
          placeholder="Search projects…"
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />
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
          className="justify-start border-dashed border-white/15 bg-transparent text-white/60 hover:bg-white/5 hover:text-white"
        >
          <FolderPlus className="w-4 h-4 mr-2" aria-hidden="true" /> Create new project
        </Button>
      )}

      <nav aria-label="Projects" className="space-y-1">
        <button
          type="button"
          onClick={() => setQuery({ projectId: null })}
          aria-current={!projectId ? 'true' : undefined}
          className={`w-full flex items-center gap-3 rounded-lg p-2 text-left transition-colors ${
            !projectId ? 'bg-white/10' : 'hover:bg-white/5'
          }`}
        >
          <span className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Library className="w-4 h-4 text-white/60" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-white truncate">All songs</span>
            <span className="block text-xs text-white/40">{stats?.song_count ?? 0} songs</span>
          </span>
        </button>

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
                className={`w-full flex items-center gap-3 rounded-lg p-2 pr-9 text-left transition-colors ${
                  projectId === project.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <span
                  aria-hidden="true"
                  style={{ backgroundImage: tint(project.id) }}
                  className="w-10 h-10 rounded-lg shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm truncate ${
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
                    className="cursor-pointer text-[#ff6b6b] focus:text-[#ff6b6b]"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete “${project.title}”? Its ${project.song_count} song(s) stay in your library.`,
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

        {search && !visible.length && (
          <p className="px-2 py-6 text-center text-sm text-white/40">
            No projects match “{search}”.
          </p>
        )}
      </nav>
    </div>
  );
}
