import { create } from 'zustand';
import { toast } from 'sonner';
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
  /** The modal is hidden but the job is still being watched. */
  dismissed: boolean;

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

      // Nothing is on screen to announce a job the user sent to the
      // background, so tell them here.
      if (get().dismissed && song) {
        toast.success(`"${song.title}" is ready`, {
          description: 'Saved to your library.',
        });
      }
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
    dismissed: false,

    start: async (options) => {
      set({ submitting: true, error: null, lastSong: null, dismissed: false });
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
      // Only adopt a job when nothing is already being tracked. This runs
      // whenever the auth session object changes — a token refresh, say — and
      // without this guard it would re-adopt the job the user is actively
      // watching, hide their progress modal, and open a second subscription.
      if (get().job) return;

      const active = await api.fetchActiveJob();
      if (active) {
        // A job picked up after a reload was started before this page existed,
        // so the user is not sitting in front of the create flow waiting on it.
        // Track it and announce completion with a toast rather than throwing a
        // modal over whatever they are currently doing.
        set({ job: active, dismissed: true });
        watch(active.id);
      }
    },

    dismiss: () => {
      // "Run in background" hides the modal but keeps the subscription alive.
      // Tearing it down here meant the library was never refreshed and the
      // user got no word when the song landed — it only appeared on a manual
      // reload.
      set({ dismissed: true, error: null });
    },

    reset: () => {
      teardown();
      set({ job: null, submitting: false, error: null, lastSong: null, dismissed: false });
    },
  };
});

onSignOut(() => useGenerationStore.getState().reset());
