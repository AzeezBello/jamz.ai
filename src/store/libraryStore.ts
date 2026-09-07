import { create } from 'zustand';
import * as api from '@/lib/api';
import { onSignOut } from './authStore';
import { usePlayerStore } from './playerStore';
import type { Song, SongVisibility } from '@/lib/types';

interface LibraryState {
  mySongs: Song[];
  publicSongs: Song[];
  loadingMine: boolean;
  loadingPublic: boolean;
  error: string | null;

  loadMySongs: (search?: string) => Promise<void>;
  loadPublicSongs: (search?: string) => Promise<void>;
  upsertSong: (song: Song) => void;
  toggleLike: (songId: string) => Promise<void>;
  removeSong: (songId: string) => Promise<void>;
  changeVisibility: (songId: string, visibility: SongVisibility) => Promise<void>;
  reset: () => void;
}

const EMPTY = {
  mySongs: [],
  publicSongs: [],
  loadingMine: false,
  loadingPublic: false,
  error: null,
};

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  ...EMPTY,

  loadMySongs: async (search) => {
    set({ loadingMine: true, error: null });
    try {
      set({ mySongs: await api.fetchMySongs({ search }) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Could not load your library.' });
    } finally {
      set({ loadingMine: false });
    }
  },

  loadPublicSongs: async (search) => {
    set({ loadingPublic: true, error: null });
    try {
      set({ publicSongs: await api.fetchPublicSongs({ search }) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Could not load the feed.' });
    } finally {
      set({ loadingPublic: false });
    }
  },

  /** Applies a song to every list that holds it, so no copy goes stale. */
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

    // Optimistic, then reconciled with the count the server returns.
    const optimistic: Song = {
      ...current,
      is_liked: !current.is_liked,
      like_count: current.like_count + (current.is_liked ? -1 : 1),
    };
    get().upsertSong(optimistic);

    try {
      const { liked, likeCount } = await api.toggleLike(songId);
      get().upsertSong({ ...current, is_liked: liked, like_count: likeCount });
    } catch (err) {
      get().upsertSong(current);
      set({ error: err instanceof Error ? err.message : 'Could not update the like.' });
    }
  },

  removeSong: async (songId) => {
    await api.deleteSong(songId);
    set({
      mySongs: get().mySongs.filter((s) => s.id !== songId),
      publicSongs: get().publicSongs.filter((s) => s.id !== songId),
    });
    if (usePlayerStore.getState().currentSong?.id === songId) usePlayerStore.getState().stop();
  },

  changeVisibility: async (songId, visibility) => {
    const updated = await api.setSongVisibility(songId, visibility);
    get().upsertSong(updated);
  },

  reset: () => set({ ...EMPTY }),
}));

// Signing out must not leave the previous account's library on screen.
onSignOut(() => {
  useLibraryStore.getState().reset();
  usePlayerStore.getState().stop();
});
