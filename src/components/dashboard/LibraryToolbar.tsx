import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Filter, LayoutGrid, List, Search, Share2 } from 'lucide-react';
import type { SongSort } from '@/lib/api';
import type { LibraryFilter } from '@/store/libraryStore';

const SORTS: Array<{ value: SongSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'plays', label: 'Most played' },
  { value: 'likes', label: 'Most liked' },
  { value: 'longest', label: 'Longest' },
  { value: 'title', label: 'Title A–Z' },
];

const VISIBILITIES: Array<{ value: LibraryFilter; label: string }> = [
  { value: 'all', label: 'All songs' },
  { value: 'private', label: 'Private' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'public', label: 'Public' },
];

export type AudioTypeFilter = 'all' | 'vocals' | 'instrumental';

interface LibraryToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  sort: SongSort;
  onSort: (value: SongSort) => void;
  visibility: LibraryFilter;
  onVisibility: (value: LibraryFilter) => void;
  view: 'list' | 'grid';
  onView: (value: 'list' | 'grid') => void;
  showVisibilityFilter: boolean;
  audioType?: AudioTypeFilter;
  onAudioType?: (value: AudioTypeFilter) => void;
}

export default function LibraryToolbar({
  search,
  onSearch,
  sort,
  onSort,
  visibility,
  onVisibility,
  view,
  onView,
  showVisibilityFilter,
  audioType = 'all',
  onAudioType,
}: LibraryToolbarProps) {
  const activeFilterCount =
    (visibility !== 'all' ? 1 : 0) + (audioType !== 'all' ? 1 : 0) + (search.trim() ? 1 : 0);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
      <div className="flex items-center gap-2 w-full md:max-w-md">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search songs"
            placeholder="Search titles, prompts, lyrics…"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            className="pl-10 rounded-full bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>

        { onAudioType && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="More song filters"
                className={`rounded-full border-white/10 text-xs shrink-0 ${
                  activeFilterCount > 0
                    ? 'bg-white text-black hover:bg-white/90 font-semibold'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Filter className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-[#0a0a0a] border-white/10 text-white">
              <DropdownMenuLabel className="text-xs text-white/40">Audio Type</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={audioType}
                onValueChange={(val) => onAudioType(val as AudioTypeFilter)}
              >
                <DropdownMenuRadioItem value="all" className="cursor-pointer text-xs">
                  All tracks
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="vocals" className="cursor-pointer text-xs">
                  With Vocals
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="instrumental" className="cursor-pointer text-xs">
                  Instrumental Only
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              {activeFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <button
                    type="button"
                    onClick={() => {
                      onAudioType('all');
                      onVisibility('all');
                      onSearch('');
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs text-[#ff6b6b] hover:bg-white/5 rounded"
                  >
                    Reset all filters
                  </button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showVisibilityFilter && (
          <Select
            value={visibility}
            onValueChange={(value) => onVisibility(value as LibraryFilter)}
          >
            <SelectTrigger
              aria-label="Filter by visibility"
              className="w-[130px] rounded-full bg-white/5 border-white/10 text-white text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
              {VISIBILITIES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={sort} onValueChange={(value) => onSort(value as SongSort)}>
          <SelectTrigger
            aria-label="Sort songs"
            className="w-[140px] rounded-full bg-white/5 border-white/10 text-white text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
            {SORTS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div
          role="group"
          aria-label="View style"
          className="flex items-center rounded-full border border-white/10 bg-white/5 p-0.5"
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="List view"
            aria-pressed={view === 'list'}
            onClick={() => onView('list')}
            className={`h-8 w-8 rounded-full ${view === 'list' ? 'bg-white/15 text-white' : 'text-white/50'}`}
          >
            <List className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
            onClick={() => onView('grid')}
            className={`h-8 w-8 rounded-full ${view === 'grid' ? 'bg-white/15 text-white' : 'text-white/50'}`}
          >
            <LayoutGrid className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void navigator.clipboard?.writeText(window.location.href);
            toast.success('Copied workspace link to clipboard.');
          }}
          aria-label="Share workspace"
          className="rounded-full border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white text-xs"
        >
          <Share2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
          Share
        </Button>
      </div>
    </div>
  );
}
