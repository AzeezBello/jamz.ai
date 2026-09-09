import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { fetchRecentJobs } from '@/lib/api';
import { useGenerationStore } from '@/store/generationStore';
import { formatRelative } from '@/lib/format';
import type { GenerationJob, JobStatus } from '@/lib/types';

const STATUS_STYLE: Record<JobStatus, { icon: typeof Loader2; className: string; label: string }> =
  {
    queued: { icon: Loader2, className: 'text-white/50', label: 'Queued' },
    running: { icon: Loader2, className: 'text-[#ff8e8e]', label: 'Working' },
    completed: { icon: CheckCircle2, className: 'text-emerald-400', label: 'Done' },
    failed: { icon: XCircle, className: 'text-[#ff6b6b]', label: 'Failed' },
    cancelled: { icon: AlertCircle, className: 'text-white/40', label: 'Cancelled' },
  };

/**
 * Recent generation attempts.
 *
 * Jobs were previously invisible once the modal closed: a failure left no
 * trace in the UI at all, so a user whose credits had been refunded had no way
 * to see what happened or try again.
 */
export default function GenerationActivity() {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const activeJob = useGenerationStore((state) => state.job);
  const start = useGenerationStore((state) => state.start);

  const refresh = useCallback(async () => {
    try {
      setJobs(await fetchRecentJobs(8));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Re-read whenever the tracked job changes state, so the list follows along.
  useEffect(() => {
    if (activeJob) void refresh();
  }, [activeJob?.status, activeJob?.id, refresh, activeJob]);

  const retry = async (job: GenerationJob) => {
    const created = await start({
      prompt: job.prompt,
      lyrics: job.params?.lyrics,
      style: job.params?.style,
      instrumental: job.params?.instrumental,
      seconds: job.params?.seconds,
    });
    if (created) {
      toast.success('Retrying that generation.');
      void refresh();
    } else {
      toast.error(useGenerationStore.getState().error ?? 'Could not retry.');
    }
  };

  const unfinished = jobs.filter((job) => job.status === 'queued' || job.status === 'running');
  const recent = jobs.filter((job) => job.status !== 'completed').slice(0, 4);

  if (loading || (!unfinished.length && !recent.length)) return null;

  return (
    <section aria-label="Recent generations" className="mb-8">
      <h2 className="text-sm font-medium text-white/50 mb-3">Activity</h2>
      <ul className="space-y-2">
        {[...unfinished, ...recent.filter((job) => !unfinished.includes(job))].map((job) => {
          const style = STATUS_STYLE[job.status];
          const Icon = style.icon;
          const spinning = job.status === 'queued' || job.status === 'running';

          return (
            <li
              key={job.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${style.className} ${spinning ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white/80">{job.prompt}</p>
                <p className="text-xs text-white/40">
                  {style.label}
                  {spinning && job.progress > 0 ? ` · ${job.progress}%` : ''}
                  {job.error_message ? ` · ${job.error_message}` : ''}
                  {' · '}
                  {formatRelative(job.created_at)}
                </p>
              </div>

              {spinning && (
                <div
                  className="hidden sm:block h-1 w-24 overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-valuenow={job.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progress for ${job.prompt}`}
                >
                  <div
                    className="h-full gradient-coral transition-all duration-500"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              )}

              {(job.status === 'failed' || job.status === 'cancelled') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void retry(job)}
                  className="text-white/60 hover:text-white shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  Retry
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
