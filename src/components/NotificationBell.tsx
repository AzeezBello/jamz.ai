import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { formatRelative } from '@/lib/format';

/**
 * The notifications table has been written to since generation shipped — every
 * completed song inserts a row — but nothing ever read it back.
 *
 * State and the realtime subscription live in the store, because the nav
 * mounts this component more than once (sidebar and mobile bar).
 */
export default function NotificationBell() {
  const userId = useAuthStore((state) => state.user?.id);
  const items = useNotificationStore((state) => state.items);
  const markAllRead = useNotificationStore((state) => state.markAllRead);

  if (!userId) return null;

  const unread = items.filter((item) => !item.read_at);

  return (
    <DropdownMenu onOpenChange={(open) => open && markAllRead()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unread.length ? `Notifications, ${unread.length} unread` : 'Notifications'}
          className="relative text-white/70 hover:text-white hover:bg-white/10"
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          {unread.length > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full gradient-coral text-black text-[10px] font-bold flex items-center justify-center"
            >
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 max-h-96 overflow-auto bg-[#0a0a0a] border-white/10 text-white"
      >
        <DropdownMenuLabel className="text-white/50">Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />

        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-white/40">Nothing yet.</p>
        ) : (
          items.map((item) => {
            const body = (
              <span className="flex flex-col gap-0.5">
                <span className="text-sm text-white">{item.title}</span>
                {item.body && <span className="text-xs text-white/50 truncate">{item.body}</span>}
                <span className="text-[10px] text-white/30">{formatRelative(item.created_at)}</span>
              </span>
            );

            return (
              <DropdownMenuItem
                key={item.id}
                asChild={Boolean(item.link)}
                className="cursor-pointer"
              >
                {item.link ? <Link to={item.link}>{body}</Link> : body}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
