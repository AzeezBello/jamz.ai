import { create } from 'zustand';
import * as api from '@/lib/api';
import { onSignOut } from './authStore';
import { useLibraryStore } from './libraryStore';
import type { Project } from '@/lib/types';

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  create: (title: string) => Promise<Project | null>;
  rename: (projectId: string, title: string) => Promise<void>;
  remove: (projectId: string) => Promise<void>;
  moveSongs: (songIds: string[], projectId: string | null) => Promise<number>;
  reset: () => void;
}

const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ projects: await api.fetchProjects() });
    } catch (err) {
      set({ error: message(err, 'Could not load your projects.') });
    } finally {
      set({ loading: false });
    }
  },

  create: async (title) => {
    try {
      const project = await api.createProject(title);
      await get().load();
      return project;
    } catch (err) {
      set({ error: message(err, 'Could not create that project.') });
      return null;
    }
  },

  rename: async (projectId, title) => {
    await api.renameProject(projectId, title);
    await get().load();
  },

  remove: async (projectId) => {
    await api.deleteProject(projectId);
    const library = useLibraryStore.getState();
    // The songs were unfiled rather than deleted; if the user was looking at
    // this project, drop them back to the full library.
    if (library.projectId === projectId) library.setQuery({ projectId: null });
    await get().load();
    void library.loadMySongs();
  },

  moveSongs: async (songIds, projectId) => {
    const moved = await api.moveSongsToProject(songIds, projectId);
    await get().load();
    void useLibraryStore.getState().loadMySongs();
    return moved;
  },

  reset: () => set({ projects: [], loading: false, error: null }),
}));

onSignOut(() => useProjectStore.getState().reset());
