import { create } from 'zustand';
import { fetchNotifications, markNotificationsRead } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { onSignOut, useAuthStore } from './authStore';
import type { Notification } from '@/lib/types';

interface NotificationState {
  items: Notification[];
  load: () => Promise<void>;
  markAllRead: () => void;
  /** One subscription for the whole app, however many bells are mounted. */
  connect: (userId: string) => void;
  reset: () => void;
}

let channel: ReturnType<typeof supabase.channel> | null = null;
let connectedFor: string | null = null;

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  items: [],

  load: async () => {
    try {
      set({ items: await fetchNotifications() });
    } catch {
      // Never break the header over notifications.
    }
  },

  markAllRead: () => {
    if (!get().items.some((item) => !item.read_at)) return;
    const now = new Date().toISOString();
    // Optimistic: the badge should not linger through the round trip.
    set({ items: get().items.map((item) => ({ ...item, read_at: item.read_at ?? now })) });
    void markNotificationsRead();
  },

  connect: (userId) => {
    // The nav renders a bell in the sidebar, the mobile bar and the signed-out
    // header. Without this guard each mounted copy would open its own channel.
    if (connectedFor === userId && channel) return;

    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
    connectedFor = userId;
    void get().load();

    channel = supabase
      .channel(`notifications:${userId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => void get().load(),
      )
      .subscribe();
  },

  reset: () => {
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
    connectedFor = null;
    set({ items: [] });
  },
}));

onSignOut(() => useNotificationStore.getState().reset());

useAuthStore.subscribe((state) => {
  const userId = state.user?.id;
  if (userId) useNotificationStore.getState().connect(userId);
});
