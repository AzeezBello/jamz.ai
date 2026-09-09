import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EyeOff, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import EmptyState from '@/components/onboarding/EmptyState';
import { fetchModerationQueue, isModerator, resolveReport } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import type { ModerationReport } from '@/lib/types';

type Status = 'open' | 'actioned' | 'dismissed';

export default function ModerationPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>('open');
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (next: Status) => {
    setLoading(true);
    try {
      setReports(await fetchModerationQueue(next));
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void isModerator().then(setAllowed);
  }, []);

  useEffect(() => {
    if (allowed) void load(status);
  }, [allowed, status, load]);

  const act = async (report: ModerationReport, action: 'dismiss' | 'unlist' | 'remove') => {
    setBusyId(report.id);
    try {
      await resolveReport(report.id, action);
      toast.success(
        action === 'dismiss'
          ? 'Report dismissed.'
          : `Song ${action === 'remove' ? 'removed' : 'unlisted'}.`,
      );
      await load(status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not resolve that report.');
    } finally {
      setBusyId(null);
    }
  };

  if (allowed === null) {
    return (
      <div className="mx-auto max-w-4xl px-6 pt-8 pb-32">
        <Skeleton className="h-32 w-full bg-white/5" />
      </div>
    );
  }

  // Not a 404: the route exists, the person just is not a moderator. The
  // database refuses regardless of what is rendered here.
  if (!allowed) {
    return (
      <div className="mx-auto max-w-4xl px-6 pt-8 pb-32">
        <EmptyState
          icon={ShieldCheck}
          title="Moderation is restricted"
          description="Your account does not have moderator access. If you think that is wrong, contact an administrator."
          action={
            <Button
              asChild
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Link to="/dashboard">Back to your library</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 pt-8 pb-32">
      <Tabs value={status} onValueChange={(value) => setStatus(value as Status)} className="mb-6">
        <TabsList className="bg-white/5">
          {(['open', 'actioned', 'dismissed'] as const).map((option) => (
            <TabsTrigger
              key={option}
              value={option}
              className="capitalize data-[state=active]:bg-[#ff6b6b] data-[state=active]:text-black"
            >
              {option}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full bg-white/5" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={status === 'open' ? 'Nothing waiting' : `No ${status} reports`}
          description={
            status === 'open'
              ? 'No songs have been reported. This queue fills up when someone flags a public track.'
              : 'Nothing has been resolved this way yet.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/song/${report.song_id}`}
                    className="font-medium text-white hover:underline"
                  >
                    {report.song_title}
                  </Link>
                  <p className="text-white/40 text-xs mt-0.5">
                    by {report.owner_name} · {report.song_visible} ·{' '}
                    {formatRelative(report.created_at)}
                    {report.report_count > 1 && (
                      <span className="text-[#ff8e8e]"> · {report.report_count} reports</span>
                    )}
                  </p>
                </div>
                <span className="rounded-full border border-[#ff6b6b]/40 px-2.5 py-0.5 text-xs text-[#ff8e8e] capitalize">
                  {report.reason.replace(/_/g, ' ')}
                </span>
              </div>

              {report.details && (
                <p className="mt-3 rounded-lg bg-black/40 px-3 py-2 text-sm text-white/60">
                  {report.details}
                </p>
              )}

              {status === 'open' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === report.id}
                    onClick={() => void act(report, 'dismiss')}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    {busyId === report.id && (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden="true" />
                    )}
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === report.id}
                    onClick={() => void act(report, 'unlist')}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <EyeOff className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Unlist
                  </Button>
                  <Button
                    size="sm"
                    disabled={busyId === report.id}
                    onClick={() => void act(report, 'remove')}
                    className="bg-[#ff6b6b] text-black hover:bg-[#ff8e8e]"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Remove
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
