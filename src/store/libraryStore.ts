import { create } from 'zustand';
import * as api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { onSignOut, useAuthStore } from './authStore';
import { usePlayerStore } from './playerStore';
import type { Song, SongVisibility } from '@/lib/types';

export type LibraryFilter = SongVisibility | 'all';

interface LibraryState {
  mySongs: Song[];
  publicSongs: Song[];
  likedSongs: Song[];
  stats: api.LibraryStats | null;

  loadingMine: boolean;
  loadingPublic: boolean;
  loadingMore: boolean;
  hasMoreMine: boolean;
  hasMorePublic: boolean;
  error: string | null;

  search: string;
  sort: api.SongSort;
  visibility: LibraryFilter;
  projectId: string | null;

  selectedIds: string[];

  setQuery: (
    patch: Partial<Pick<LibraryState, 'search' | 'sort' | 'visibility' | 'projectId'>>,
  ) => void;
  loadMySongs: () => Promise<void>;
  loadPublicSongs: () => Promise<void>;
  loadLikedSongs: () => Promise<void>;
  loadMoreMine: () => Promise<void>;
  loadMorePublic: () => Promise<void>;
  loadStats: () => Promise<void>;

  upsertSong: (song: Song) => void;
  toggleLike: (songId: string) => Promise<void>;
  removeSong: (songId: string) => Promise<void>;
  changeVisibility: (songId: string, visibility: SongVisibility) => Promise<void>;
  saveDetails: (songId: string, patch: { title?: string; lyrics?: string | null }) => Promise<void>;
  rerollCover: (songId: string) => Promise<void>;

  toggleSelected: (songId: string) => void;
  selectAll: (songIds: string[]) => void;
  clearSelection: () => void;
  bulkDelete: () => Promise<number>;
  bulkVisibility: (visibility: SongVisibility) => Promise<number>;

  /** Live updates so a song finishing anywhere lands in the list. */
  subscribe: (userId: string) => void;
  reset: () => void;
}

const EMPTY = {
  mySongs: [] as Song[],
  publicSongs: [] as Song[],
  likedSongs: [] as Song[],
  stats: null,
  loadingMine: false,
  loadingPublic: false,
  loadingMore: false,
  hasMoreMine: false,
  hasMorePublic: false,
  error: null,
  search: '',
  sort: 'newest' as api.SongSort,
  visibility: 'all' as LibraryFilter,
  projectId: null,
  selectedIds: [] as string[],
};

let channel: ReturnType<typeof supabase.channel> | null = null;

function unsubscribe() {
  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
  }
}

const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  ...EMPTY,

  setQuery: (patch) => {
    set({ ...patch, selectedIds: [] });
  },

  loadMySongs: async () => {
    const { search, sort, visibility, projectId } = get();
    set({ loadingMine: true, error: null });
    try {
      const page = await api.fetchMySongs({ search, sort, visibility, projectId });
      set({ mySongs: page.songs, hasMoreMine: page.hasMore });
    } catch (err) {
      set({ error: message(err, 'Could not load your library.') });
    } finally {
      set({ loadingMine: false });
    }
  },

  loadPublicSongs: async () => {
    const { search, sort } = get();
    set({ loadingPublic: true, error: null });
    try {
      const page = await api.fetchPublicSongs({ search, sort: sort === 'newest' ? 'plays' : sort });
      set({ publicSongs: page.songs, hasMorePublic: page.hasMore });
    } catch (err) {
      set({ error: message(err, 'Could not load the feed.') });
    } finally {
      set({ loadingPublic: false });
    }
  },

  loadLikedSongs: async () => {
    try {
      set({ likedSongs: await api.fetchLikedSongs() });
    } catch (err) {
      set({ error: message(err, 'Could not load your favourites.') });
    }
  },

  loadMoreMine: async () => {
    const { mySongs, search, sort, visibility, projectId, loadingMore } = get();
    if (loadingMore) return;
    set({ loadingMore: true });
    try {
      const page = await api.fetchMySongs({
        search,
        sort,
        visibility,
        projectId,
        offset: mySongs.length,
      });
      // Guard against a row arriving twice if something was inserted mid-scroll.
      const seen = new Set(mySongs.map((s) => s.id));
      set({
        mySongs: [...mySongs, ...page.songs.filter((s) => !seen.has(s.id))],
        hasMoreMine: page.hasMore,
      });
    } catch (err) {
      set({ error: message(err, 'Could not load more songs.') });
    } finally {
      set({ loadingMore: false });
    }
  },

  loadMorePublic: async () => {
    const { publicSongs, search, sort, loadingMore } = get();
    if (loadingMore) return;
    set({ loadingMore: true });
    try {
      const page = await api.fetchPublicSongs({
        search,
        sort: sort === 'newest' ? 'plays' : sort,
        offset: publicSongs.length,
      });
      const seen = new Set(publicSongs.map((s) => s.id));
      set({
        publicSongs: [...publicSongs, ...page.songs.filter((s) => !seen.has(s.id))],
        hasMorePublic: page.hasMore,
      });
    } catch (err) {
      set({ error: message(err, 'Could not load more songs.') });
    } finally {
      set({ loadingMore: false });
    }
  },

  loadStats: async () => {
    try {
      set({ stats: await api.fetchLibraryStats() });
    } catch {
      // Totals are decoration; a failure here should not blank the library.
    }
  },

  upsertSong: (song) => {
    const merge = (list: Song[]) => {
      const index = list.findIndex((s) => s.id === song.id);
      if (index === -1) return list;
      const next = [...list];
      next[index] = { ...next[index], ...song };
      return next;
    };
    set({ mySongs: merge(get().mySongs), publicSongs: merge(get().publicSongs) });
    usePlayerStore.getState().syncSong(song);
  },

  toggleLike: async (songId) => {
    const find = (list: Song[]) => list.find((s) => s.id === songId);
    const current =
      find(get().mySongs) ?? find(get().publicSongs) ?? usePlayerStore.getState().currentSong;
    if (!current) return;

    get().upsertSong({
      ...current,
      is_liked: !current.is_liked,
      like_count: current.like_count + (current.is_liked ? -1 : 1),
    });

    try {
      const { liked, likeCount } = await api.toggleLike(songId);
      get().upsertSong({ ...current, is_liked: liked, like_count: likeCount });
      // An unliked song has to leave the favourites list immediately.
      set({
        likedSongs: liked
          ? get().likedSongs
          : get().likedSongs.filter((song) => song.id !== songId),
      });
    } catch (err) {
      get().upsertSong(current);
      set({ error: message(err, 'Could not update the like.') });
    }
  },

  removeSong: async (songId) => {
    await api.deleteSong(songId);
    set({
      mySongs: get().mySongs.filter((s) => s.id !== songId),
      publicSongs: get().publicSongs.filter((s) => s.id !== songId),
      selectedIds: get().selectedIds.filter((id) => id !== songId),
    });
    if (usePlayerStore.getState().currentSong?.id === songId) usePlayerStore.getState().stop();
    void get().loadStats();
  },

  changeVisibility: async (songId, visibility) => {
    const updated = await api.setSongVisibility(songId, visibility);
    get().upsertSong(updated);
    void get().loadStats();
  },

  saveDetails: async (songId, patch) => {
    const updated = await api.updateSongDetails(songId, patch);
    get().upsertSong(updated);
  },

  rerollCover: async (songId) => {
    const song =
      get().mySongs.find((s) => s.id === songId) ?? get().publicSongs.find((s) => s.id === songId);
    get().upsertSong(await api.rerollCover(songId, song?.cover_url ?? null));
  },

  toggleSelected: (songId) => {
    const selected = get().selectedIds;
    set({
      selectedIds: selected.includes(songId)
        ? selected.filter((id) => id !== songId)
        : [...selected, songId],
    });
  },

  selectAll: (songIds) => set({ selectedIds: songIds }),
  clearSelection: () => set({ selectedIds: [] }),

  bulkDelete: async () => {
    const ids = get().selectedIds;
    let done = 0;
    for (const id of ids) {
      try {
        await api.deleteSong(id);
        done++;
      } catch {
        // Keep going; the caller reports how many actually succeeded.
      }
    }
    set({
      mySongs: get().mySongs.filter((s) => !ids.includes(s.id)),
      selectedIds: [],
    });
    void get().loadStats();
    return done;
  },

  bulkVisibility: async (visibility) => {
    const ids = get().selectedIds;
    let done = 0;
    for (const id of ids) {
      try {
        get().upsertSong(await api.setSongVisibility(id, visibility));
        done++;
      } catch {
        // As above.
      }
    }
    set({ selectedIds: [] });
    void get().loadStats();
    return done;
  },

  subscribe: (userId) => {
    unsubscribe();
    channel = supabase
      // Unique name per subscription; see NotificationBell for why.
      .channel(`library:${userId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songs', filter: `user_id=eq.${userId}` },
        () => {
          // A song can appear from a job started on another device or before a
          // reload, so refetch rather than trying to patch the row in place.
          void get().loadMySongs();
          void get().loadStats();
        },
      )
      .subscribe();
  },

  reset: () => {
    unsubscribe();
    set({ ...EMPTY });
  },
}));

onSignOut(() => {
  useLibraryStore.getState().reset();
  usePlayerStore.getState().stop();
});

// Keep the live subscription tied to whoever is signed in.
useAuthStore.subscribe((state) => {
  const userId = state.user?.id;
  if (userId) useLibraryStore.getState().subscribe(userId);
});
