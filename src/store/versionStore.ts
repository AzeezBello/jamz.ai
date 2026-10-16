import { create } from 'zustand';

/**
 * Store for version‑related UI state.
 * - `currentProjectId` – the project the user is working in (null if none).
 * - `wav` / `mp3` – the latest generated audio buffers that will be sent to the
 *   `/api/versions` endpoint.
 *
 * The store is deliberately lightweight and does not persist to localStorage –
 * it is cleared on sign‑out via the `reset` action.
 */
interface VersionState {
  /** The active project id (or null when no project is selected). */
  currentProjectId: string | null;
  /** Latest generated WAV data. */
  wav: Uint8Array | null;
  /** Optional MP3 representation of the same audio. */
  mp3: Uint8Array | null;
  /** Set the active project. */
  setProjectId: (id: string | null) => void;
  /** Store the generated audio buffers. */
  setAudio: (payload: { wav: Uint8Array; mp3?: Uint8Array }) => void;
  /** Reset all fields (used on sign‑out). */
  reset: () => void;
}

export const useVersionStore = create<VersionState>((set) => ({
  currentProjectId: null,
  wav: null,
  mp3: null,
  setProjectId: (id) => set({ currentProjectId: id }),
  setAudio: ({ wav, mp3 }) => set({ wav, mp3: mp3 ?? null }),
  reset: () => set({ currentProjectId: null, wav: null, mp3: null }),
}));
