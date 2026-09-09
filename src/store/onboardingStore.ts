import { create } from 'zustand';
import { useAuthStore } from './authStore';

export type GuideSurface = 'onboarding' | 'tour';

interface OnboardingState {
  /** Which guided surface is on screen, if any. */
  active: GuideSurface | null;
  tourStep: number;

  openTour: () => void;
  setTourStep: (step: number) => void;
  finishTour: () => Promise<void>;
  finishOnboarding: (options?: { startTour?: boolean }) => Promise<void>;
  dismissTip: (tipId: string) => Promise<void>;
  /** Decide what, if anything, a returning profile should be shown. */
  sync: () => void;
}

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  active: null,
  tourStep: 0,

  sync: () => {
    const profile = useAuthStore.getState().profile;
    if (!profile) {
      set({ active: null });
      return;
    }
    // Never interrupt someone twice: the intro shows only until it is
    // completed or skipped, and the tour only offers itself once.
    if (!profile.onboarded_at) set({ active: 'onboarding' });
    else if (get().active === 'onboarding') set({ active: null });
  },

  openTour: () => set({ active: 'tour', tourStep: 0 }),
  setTourStep: (step) => set({ tourStep: step }),

  finishOnboarding: async ({ startTour = false } = {}) => {
    set({ active: startTour ? 'tour' : null, tourStep: 0 });
    try {
      await useAuthStore.getState().saveProfile({ onboarded_at: new Date().toISOString() });
    } catch {
      // The intro is already dismissed on screen; failing to record that is
      // not worth blocking the user over — it will simply show again.
    }
  },

  finishTour: async () => {
    set({ active: null, tourStep: 0 });
    try {
      await useAuthStore.getState().saveProfile({ tour_completed_at: new Date().toISOString() });
    } catch {
      // As above.
    }
  },

  dismissTip: async (tipId) => {
    const profile = useAuthStore.getState().profile;
    if (!profile || profile.dismissed_tips?.includes(tipId)) return;
    try {
      await useAuthStore.getState().saveProfile({
        dismissed_tips: [...(profile.dismissed_tips ?? []), tipId],
      });
    } catch {
      // A hint that reappears is a small cost; do not surface an error.
    }
  },
}));

// The intro decision depends on the profile, which arrives after sign-in.
useAuthStore.subscribe((state, previous) => {
  if (state.profile !== previous.profile) useOnboardingStore.getState().sync();
});
