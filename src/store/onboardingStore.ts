import { create } from 'zustand';
import { onSignOut, useAuthStore } from './authStore';
import { track } from '@/lib/observability';

export type GuideSurface = 'onboarding' | 'tour';

const GLOBAL_DONE_KEY = 'jamz-onboarding-done';
const userDoneKey = (userId: string) => `jamz-onboarded:${userId}`;
const userTourDoneKey = (userId: string) => `jamz-tour-done:${userId}`;

/** Tracks user IDs that have already been evaluated in this tab session. */
const seenInSession = new Set<string>();

export function hasCompletedOnboardingLocally(userId?: string | null): boolean {
  try {
    if (userId && localStorage.getItem(userDoneKey(userId)) === 'true') return true;
    if (localStorage.getItem(GLOBAL_DONE_KEY) === 'true') return true;
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return false;
}

export function markOnboardingCompletedLocally(userId?: string | null): void {
  try {
    localStorage.setItem(GLOBAL_DONE_KEY, 'true');
    if (userId) localStorage.setItem(userDoneKey(userId), 'true');
  } catch {
    // Ignore storage access errors
  }
}

function markTourCompletedLocally(userId?: string | null): void {
  try {
    localStorage.setItem(GLOBAL_DONE_KEY, 'true');
    if (userId) {
      localStorage.setItem(userDoneKey(userId), 'true');
      localStorage.setItem(userTourDoneKey(userId), 'true');
    }
  } catch {
    // Ignore storage access errors
  }
}

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

    const doneOnServer = Boolean(profile.onboarded_at);
    const doneLocally = hasCompletedOnboardingLocally(profile.id);

    if (doneOnServer) {
      markOnboardingCompletedLocally(profile.id);
    }

    // Never interrupt someone twice: check both server profile and local storage,
    // and never re-open mid-session when profile refreshes in the background.
    if (doneOnServer || doneLocally || seenInSession.has(profile.id)) {
      if (get().active === 'onboarding' && (doneOnServer || doneLocally)) {
        set({ active: null });
      }
      return;
    }

    seenInSession.add(profile.id);
    set({ active: 'onboarding' });
  },

  openTour: () => {
    track('tour_started');
    set({ active: 'tour', tourStep: 0 });
  },
  setTourStep: (step) => set({ tourStep: step }),

  finishOnboarding: async ({ startTour = false } = {}) => {
    const now = new Date().toISOString();
    const profile = useAuthStore.getState().profile;
    if (profile?.id) {
      seenInSession.add(profile.id);
    }
    markOnboardingCompletedLocally(profile?.id);

    // Optimistically update in-memory profile so background syncs see onboarded_at immediately.
    if (profile) {
      useAuthStore.setState({
        profile: { ...profile, onboarded_at: now },
      });
    }

    set({ active: startTour ? 'tour' : null, tourStep: 0 });
    try {
      await useAuthStore.getState().saveProfile({ onboarded_at: now });
    } catch {
      // Local storage and in-memory state already recorded completion, so even if
      // the database schema is missing onboarded_at it will not pop up again.
    }
  },

  finishTour: async () => {
    const now = new Date().toISOString();
    const profile = useAuthStore.getState().profile;
    markTourCompletedLocally(profile?.id);

    if (profile) {
      useAuthStore.setState({
        profile: {
          ...profile,
          onboarded_at: profile.onboarded_at ?? now,
          tour_completed_at: now,
        },
      });
    }

    set({ active: null, tourStep: 0 });
    try {
      await useAuthStore.getState().saveProfile({ tour_completed_at: now });
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

// Reset session tracking on sign-out so a newly created account can still see the intro once.
onSignOut(() => {
  seenInSession.clear();
  try {
    localStorage.removeItem(GLOBAL_DONE_KEY);
  } catch {
    // Ignore storage access errors
  }
  useOnboardingStore.setState({ active: null, tourStep: 0 });
});

// The intro decision depends on the profile, which arrives after sign-in.
useAuthStore.subscribe((state, previous) => {
  if (state.profile !== previous.profile) useOnboardingStore.getState().sync();
});
