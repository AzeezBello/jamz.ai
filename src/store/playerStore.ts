import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAudioElement } from '@/lib/audio-engine';
import { getAudioUrl, recordPlay } from '@/lib/api';
import type { Song } from '@/lib/types';

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  recentSongs: Song[];
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  error: string | null;

  play: (song: Song, queue?: Song[]) => Promise<void>;
  toggle: () => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  stop: () => void;
  /** Keep a playing song's metadata in sync when the library refreshes. */
  syncSong: (song: Song) => void;
}

let listenersAttached = false;
/** Guards against a slow URL fetch resolving after the user picked another song. */
let loadToken = 0;

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => {
      const attachListeners = () => {
        if (listenersAttached) return;
        listenersAttached = true;
        const el = getAudioElement();

        el.addEventListener('timeupdate', () => set({ currentTime: el.currentTime }));
        el.addEventListener('durationchange', () => {
          if (Number.isFinite(el.duration)) set({ duration: el.duration });
        });
        el.addEventListener('play', () => set({ isPlaying: true }));
        el.addEventListener('pause', () => set({ isPlaying: false }));
        el.addEventListener('waiting', () => set({ isLoading: true }));
        el.addEventListener('playing', () => set({ isLoading: false, error: null }));
        el.addEventListener('ended', () => {
          const { repeat, currentSong, queue } = get();
          if (repeat === 'one' && currentSong) {
            el.currentTime = 0;
            void el.play();
            return;
          }
          if (repeat === 'off' && queue.length > 0 && currentSong) {
            const index = queue.findIndex((s) => s.id === currentSong.id);
            if (index === queue.length - 1 && !get().shuffle) {
              set({ isPlaying: false, currentTime: el.duration || 0 });
              return;
            }
          }
          set({ isPlaying: false, currentTime: el.duration || 0 });
          get().next();
        });
        el.addEventListener('error', () => {
          set({ isPlaying: false, isLoading: false, error: 'This track could not be played.' });
        });
      };

      return {
        currentSong: null,
        queue: [],
        recentSongs: [],
        isPlaying: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
        volume: 0.8,
        muted: false,
        shuffle: false,
        repeat: 'all',
        error: null,

        play: async (song, queue) => {
          attachListeners();
          const el = getAudioElement();
          const token = ++loadToken;

          const nextRecent = [
            song,
            ...get().recentSongs.filter((item) => item.id !== song.id),
          ].slice(0, 12);

          set({
            currentSong: song,
            queue: queue ?? (get().queue.some((s) => s.id === song.id) ? get().queue : [song]),
            recentSongs: nextRecent,
            isLoading: true,
            error: null,
            currentTime: 0,
            duration: song.duration_seconds || 0,
          });

          try {
            const url = await getAudioUrl(song.id, false);
            if (token !== loadToken) return; // superseded by a newer play()

            el.src = url;
            el.load();
            el.volume = get().muted ? 0 : get().volume;
            el.muted = get().muted;
            await el.play();
            void recordPlay(song.id);
          } catch (err) {
            if (token !== loadToken) return;
            set({
              isLoading: false,
              isPlaying: false,
              error: err instanceof Error ? err.message : 'Playback failed.',
            });
          }
        },

        toggle: () => (get().isPlaying ? get().pause() : get().resume()),

        pause: () => {
          getAudioElement().pause();
          set({ isPlaying: false });
        },

        resume: () => {
          const el = getAudioElement();
          if (!el.src) return;
          void el.play().catch(() => set({ error: 'Playback failed.' }));
        },

        next: () => {
          const { queue, currentSong, shuffle } = get();
          if (!currentSong || queue.length < 2) return;
          if (shuffle) {
            const others = queue.filter((s) => s.id !== currentSong.id);
            const randomSong = others[Math.floor(Math.random() * others.length)];
            if (randomSong) void get().play(randomSong, queue);
            return;
          }
          const index = queue.findIndex((s) => s.id === currentSong.id);
          const nextSong = queue[(index + 1) % queue.length];
          if (nextSong) void get().play(nextSong, queue);
        },

        previous: () => {
          const { queue, currentSong } = get();
          if (!currentSong || !queue.length) return;
          // Mirrors every music player: restart the track before skipping back.
          if (get().currentTime > 3) {
            get().seek(0);
            return;
          }
          const index = queue.findIndex((s) => s.id === currentSong.id);
          const prevSong = queue[(index - 1 + queue.length) % queue.length];
          if (prevSong) void get().play(prevSong, queue);
        },

        seek: (seconds) => {
          const el = getAudioElement();
          if (Number.isFinite(seconds)) {
            el.currentTime = Math.max(0, Math.min(seconds, el.duration || seconds));
            set({ currentTime: el.currentTime });
          }
        },

        setVolume: (volume) => {
          // Dragging the slider is also the unmute gesture: any level above
          // zero un-mutes, and dragging to zero mutes.
          const clamped = Math.max(0, Math.min(1, volume));
          const muted = clamped === 0;
          const el = getAudioElement();
          el.volume = clamped;
          el.muted = muted;
          set({ volume: clamped, muted });
        },

        setMuted: (muted) => {
          const el = getAudioElement();
          el.muted = muted;
          if (!muted && get().volume === 0) {
            el.volume = 0.5;
            set({ volume: 0.5 });
          }
          set({ muted });
        },

        toggleShuffle: () => set({ shuffle: !get().shuffle }),

        cycleRepeat: () => {
          const order: RepeatMode[] = ['off', 'all', 'one'];
          const nextIndex = (order.indexOf(get().repeat) + 1) % order.length;
          set({ repeat: order[nextIndex] });
        },

        stop: () => {
          const el = getAudioElement();
          el.pause();
          el.removeAttribute('src');
          el.load();
          loadToken++;
          set({
            currentSong: null,
            queue: [],
            isPlaying: false,
            isLoading: false,
            currentTime: 0,
            duration: 0,
            error: null,
          });
        },

        syncSong: (song) => {
          if (get().currentSong?.id === song.id) set({ currentSong: song });
          set({
            queue: get().queue.map((s) => (s.id === song.id ? song : s)),
            recentSongs: get().recentSongs.map((s) => (s.id === song.id ? song : s)),
          });
        },
      };
    },
    {
      name: 'jamz-player-preferences',
      // Only device preferences and recent playback list persist.
      partialize: (state) => ({
        volume: state.volume,
        muted: state.muted,
        shuffle: state.shuffle,
        repeat: state.repeat,
        recentSongs: state.recentSongs,
      }),
    },
  ),
);
