import type { GenerationJob, JobStatus } from './types';

/**
 * The job state machine as the client understands it. The server enforces the
 * same transitions in SQL; this keeps the UI from offering actions that would
 * be rejected, and makes the rules testable.
 */
export const TERMINAL_STATUSES: readonly JobStatus[] = ['completed', 'failed', 'cancelled'];

const ALLOWED_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  queued: ['running', 'cancelled', 'failed'],
  running: ['completed', 'failed', 'cancelled', 'queued'], // requeued after a lease timeout
  completed: [],
  failed: [],
  cancelled: [],
};

export function isTerminal(status: JobStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function canCancel(job: Pick<GenerationJob, 'status' | 'cancel_requested'>): boolean {
  return !isTerminal(job.status) && !job.cancel_requested;
}

/**
 * Credits come back for anything that did not produce a song. A completed job
 * keeps the charge; a job that never ran, or was abandoned midway, does not.
 */
export function shouldRefund(status: JobStatus): boolean {
  return status === 'failed' || status === 'cancelled';
}

export function describeJob(
  job: Pick<GenerationJob, 'status' | 'cancel_requested' | 'status_message'>,
): string {
  if (job.status === 'running' && job.cancel_requested) return 'Cancelling…';
  return job.status_message || 'Working…';
}
