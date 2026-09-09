import { Checkbox } from '@/components/ui/checkbox';
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
  Download,
  Globe,
  Heart,
  Link2,
  Lock,
  MoreVertical,
  Copy,
  ImageIcon,
  Pencil,
  Play,
  Share2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCount, formatDuration, formatRelative } from '@/lib/format';
import { copyShareLink, downloadSong } from '@/lib/download';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { useAuthStore } from '@/store/authStore';
import { useGenerationStore } from '@/store/generationStore';
import type { Song, SongVisibility } from '@/lib/types';

const VISIBILITY_ICON: Record<SongVisibility, typeof Lock> = {
  private: Lock,
  unlisted: Link2,
  public: Globe,
};

interface SongTableProps {
  songs: Song[];
  owned: boolean;
  onEdit: (song: Song) => void;
  onDelete: (song: Song) => void;
}

export default function SongTable({ songs, owned, onEdit, onDelete }: SongTableProps) {
  const {
    selectedIds,
    toggleSelected,
    selectAll,
    clearSelection,
    toggleLike,
    changeVisibility,
    rerollCover,
  } = useLibraryStore();
  const createVariation = useGenerationStore((state) => state.createVariation);
  const play = usePlayerStore((state) => state.play);
  const currentSong = usePlayerStore((state) => state.currentSong);
  const session = useAuthStore((state) => state.session);

  const allSelected = songs.length > 0 && selectedIds.length === songs.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px]">
        <caption className="sr-only">
          {owned ? 'Songs you have generated' : 'Public songs from the community'}
        </caption>
        <thead className="bg-white/5">
          <tr className="text-left text-white/50 text-sm">
            {owned && (
              <th scope="col" className="px-4 py-3 w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) =>
                    checked ? selectAll(songs.map((s) => s.id)) : clearSelection()
                  }
                  aria-label={allSelected ? 'Clear selection' : 'Select all songs'}
                />
              </th>
            )}
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
          {songs.map((song, index) => {
            const VisibilityIcon = VISIBILITY_ICON[song.visibility];
            const isCurrent = currentSong?.id === song.id;
            const selected = selectedIds.includes(song.id);

            return (
              <tr
                key={song.id}
                tabIndex={0}
                aria-label={`Play ${song.title} by ${song.artist ?? 'unknown artist'}`}
                aria-selected={owned ? selected : undefined}
                className={`group transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6b6b] ${
                  selected ? 'bg-[#ff6b6b]/10' : 'hover:bg-white/5 focus-visible:bg-white/10'
                }`}
                onClick={() => void play(song, songs)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void play(song, songs);
                  }
                }}
              >
                {owned && (
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleSelected(song.id)}
                      aria-label={`Select ${song.title}`}
                    />
                  </td>
                )}

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
                        {owned && (
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
                    onClick={(event) => {
                      event.stopPropagation();
                      if (session) void toggleLike(song.id);
                    }}
                    disabled={!session}
                    aria-pressed={Boolean(song.is_liked)}
                    aria-label={song.is_liked ? `Unlike ${song.title}` : `Like ${song.title}`}
                    className={`flex items-center gap-1 rounded px-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6b6b] ${
                      song.is_liked ? 'text-[#ff6b6b]' : 'text-white/50'
                    } hover:text-[#ff6b6b] disabled:hover:text-white/50`}
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

                <td className="px-4 py-3 text-white/50">{formatDuration(song.duration_seconds)}</td>

                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`More actions for ${song.title}`}
                        onClick={(event) => event.stopPropagation()}
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
                        onClick={(event) => {
                          event.stopPropagation();
                          void copyShareLink(song.id);
                        }}
                        className="cursor-pointer"
                      >
                        <Share2 className="w-4 h-4 mr-2" aria-hidden="true" /> Copy link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          void downloadSong(song.id, song.title);
                        }}
                        className="cursor-pointer"
                      >
                        <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Download
                      </DropdownMenuItem>

                      {owned && (
                        <>
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              onEdit(song);
                            }}
                            className="cursor-pointer"
                          >
                            <Pencil className="w-4 h-4 mr-2" aria-hidden="true" /> Edit details
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              void createVariation(song).then((job) =>
                                job
                                  ? toast.success('Making a variation…')
                                  : toast.error(
                                      useGenerationStore.getState().error ??
                                        'Could not start a variation.',
                                    ),
                              );
                            }}
                            className="cursor-pointer"
                          >
                            <Copy className="w-4 h-4 mr-2" aria-hidden="true" /> Create variation
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              void rerollCover(song.id).catch((err) => toast.error(err.message));
                            }}
                            className="cursor-pointer"
                          >
                            <ImageIcon className="w-4 h-4 mr-2" aria-hidden="true" /> New cover
                          </DropdownMenuItem>

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
                            onClick={(event) => {
                              event.stopPropagation();
                              onDelete(song);
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
  );
}
