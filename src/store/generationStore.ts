import { create } from 'zustand';
import * as api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { onSignOut, useAuthStore } from './authStore';
import { useLibraryStore } from './libraryStore';
import type { GenerationJob, Song } from '@/lib/types';

interface GenerationState {
  job: GenerationJob | null;
  submitting: boolean;
  error: string | null;
  /** Set when a job completes so the caller can autoplay the result. */
  lastSong: Song | null;

  start: (options: api.GenerationOptions) => Promise<GenerationJob | null>;
  cancel: () => Promise<void>;
  /** Re-attach to an in-flight job after a reload. */
  resume: () => Promise<void>;
  dismiss: () => void;
  reset: () => void;
}

let channel: ReturnType<typeof supabase.channel> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function teardown() {
  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export const useGenerationStore = create<GenerationState>()((set, get) => {
  const finish = async (job: GenerationJob) => {
    teardown();
    set({ job });
    void useAuthStore.getState().refreshProfile();

    if (job.status === 'completed' && job.song_id) {
      const song = await api.fetchSong(job.song_id);
      set({ lastSong: song });
      void useLibraryStore.getState().loadMySongs();
    }
  };

  const watch = (jobId: string) => {
    teardown();

    channel = supabase
      .channel(`generation_job:${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'generation_jobs', filter: `id=eq.${jobId}` },
        (payload) => {
          const job = payload.new as GenerationJob;
          set({ job });
          if (['completed', 'failed', 'cancelled'].includes(job.status)) void finish(job);
        },
      )
      .subscribe();

    // Realtime can drop; polling is the floor that guarantees the modal
    // eventually reflects a terminal state.
    pollTimer = setInterval(async () => {
      const job = await api.fetchJob(jobId);
      if (!job) return;
      set({ job });
      if (['completed', 'failed', 'cancelled'].includes(job.status)) void finish(job);
    }, 3000);
  };

  return {
    job: null,
    submitting: false,
    error: null,
    lastSong: null,

    start: async (options) => {
      set({ submitting: true, error: null, lastSong: null });
      try {
        const job = await api.startGeneration({
          ...options,
          // Stable per attempt, so a retried POST resolves to the same job
          // instead of charging the user twice.
          idempotencyKey: options.idempotencyKey ?? crypto.randomUUID(),
        });
        set({ job });
        void useAuthStore.getState().refreshProfile();
        watch(job.id);
        return job;
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Could not start generation.' });
        return null;
      } finally {
        set({ submitting: false });
      }
    },

    cancel: async () => {
      const job = get().job;
      if (!job) return;
      try {
        // Server-side cancellation: the worker stops and the credits come
        // back. Closing the modal alone would not have done either.
        const updated = await api.cancelGeneration(job.id);
        set({ job: updated });
        if (updated.status === 'cancelled') await finish(updated);
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Could not cancel.' });
      }
    },

    resume: async () => {
      const active = await api.fetchActiveJob();
      if (active) {
        set({ job: active });
        watch(active.id);
      }
    },

    dismiss: () => {
      // Leaves the job running; it will finish and land in the library.
      teardown();
      set({ job: null, error: null });
    },

    reset: () => {
      teardown();
      set({ job: null, submitting: false, error: null, lastSong: null });
    },
  };
});

onSignOut(() => useGenerationStore.getState().reset());
