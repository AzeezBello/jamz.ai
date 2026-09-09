import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

/**
 * Chrome preferences only.
 *
 * This is a per-device layout choice, not account data, so localStorage is the
 * right home for it — unlike onboarding state, which belongs on the profile so
 * it follows the user between devices.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: 'jamz-ui-preferences' },
  ),
);

/** Tailwind classes for the sidebar width, shared with the content offset. */
export const SIDEBAR_WIDTH = { expanded: 'w-64', collapsed: 'w-[72px]' } as const;
export const CONTENT_OFFSET = { expanded: 'md:pl-64', collapsed: 'md:pl-[72px]' } as const;
