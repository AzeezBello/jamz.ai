import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List, Search } from 'lucide-react';
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
}: LibraryToolbarProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
      <div className="relative w-full md:max-w-xs">
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
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showVisibilityFilter && (
          <Select
            value={visibility}
            onValueChange={(value) => onVisibility(value as LibraryFilter)}
          >
            <SelectTrigger
              aria-label="Filter by visibility"
              className="w-[140px] bg-white/5 border-white/10 text-white"
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
            className="w-[150px] bg-white/5 border-white/10 text-white"
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
          className="flex items-center rounded-md border border-white/10 bg-white/5 p-0.5"
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="List view"
            aria-pressed={view === 'list'}
            onClick={() => onView('list')}
            className={`h-8 w-8 ${view === 'list' ? 'bg-white/10 text-white' : 'text-white/50'}`}
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
            className={`h-8 w-8 ${view === 'grid' ? 'bg-white/10 text-white' : 'text-white/50'}`}
          >
            <LayoutGrid className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
