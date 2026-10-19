import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ComposerDraft {
  prompt?: string;
  style?: string;
  lyrics?: string;
  title?: string;
  contentType?: 'songs' | 'speech';
  model?: string;
  instrumental?: boolean;
  mode?: 'simple' | 'advanced';
}

export interface StylePreset {
  id: string;
  name: string;
  style: string;
}

const DEFAULT_STYLE_PRESETS: StylePreset[] = [
  {
    id: 'roots-reggae',
    name: 'Vintage Roots Reggae (1970s Dub)',
    style:
      'deep vintage Jamaican roots reggae, analog warmth, raw raspy vocals, fat basslines, syncopated guitar skanks, 1970s live band dub tape echo, groovy organ chops',
  },
  {
    id: 'midnight-neosoul',
    name: 'Midnight Neo-Soul & Rhodes',
    style:
      'warm Fender Rhodes chords, laid-back pocket drums, upright bass, silky stacked harmonies, vinyl crackle, late-night intimate groove',
  },
  {
    id: 'analog-synthwave',
    name: 'Analog Horizon Synthwave',
    style:
      'arpeggiated Juno-106 synths, gated reverb snare, driving sub bass, cinematic neon atmosphere, soaring analog lead',
  },
  {
    id: 'afro-funk',
    name: 'Afro-Funk & Talking Drum',
    style:
      'poly-rhythmic percussion, mutation funk horn section, interlocking clean guitars, energetic call-and-response vocals, warm tape saturation',
  },
];

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  composerDraft: ComposerDraft | null;
  setComposerDraft: (draft: ComposerDraft | null) => void;

  followedCreators: string[];
  toggleFollowCreator: (handle: string) => void;

  archivedProjects: string[];
  toggleArchiveProject: (projectId: string) => void;

  savedStylePresets: StylePreset[];
  addStylePreset: (name: string, style: string) => void;
  removeStylePreset: (id: string) => void;
}

/**
 * Chrome preferences and local studio conveniences.
 *
 * Per-device layout choices and local presets live in localStorage, while
 * onboarding state belongs on the profile so it follows the user between devices.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      composerDraft: null,
      setComposerDraft: (draft) => set({ composerDraft: draft }),

      followedCreators: [],
      toggleFollowCreator: (handle) => {
        const current = get().followedCreators;
        set({
          followedCreators: current.includes(handle)
            ? current.filter((h) => h !== handle)
            : [...current, handle],
        });
      },

      archivedProjects: [],
      toggleArchiveProject: (projectId) => {
        const current = get().archivedProjects;
        set({
          archivedProjects: current.includes(projectId)
            ? current.filter((id) => id !== projectId)
            : [...current, projectId],
        });
      },

      savedStylePresets: DEFAULT_STYLE_PRESETS,
      addStylePreset: (name, style) => {
        const trimmedName = name.trim();
        const trimmedStyle = style.trim();
        if (!trimmedName || !trimmedStyle) return;
        set({
          savedStylePresets: [
            { id: `preset-${Date.now()}`, name: trimmedName, style: trimmedStyle },
            ...get().savedStylePresets,
          ],
        });
      },
      removeStylePreset: (id) => {
        set({
          savedStylePresets: get().savedStylePresets.filter((p) => p.id !== id),
        });
      },
    }),
    {
      name: 'jamz-ui-preferences',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        followedCreators: state.followedCreators,
        archivedProjects: state.archivedProjects,
        savedStylePresets: state.savedStylePresets,
      }),
    },
  ),
);

/** Tailwind classes for the sidebar width, shared with the content offset. */
export const SIDEBAR_WIDTH = { expanded: 'w-64', collapsed: 'w-[72px]' } as const;
export const CONTENT_OFFSET = { expanded: 'md:pl-64', collapsed: 'md:pl-[72px]' } as const;
