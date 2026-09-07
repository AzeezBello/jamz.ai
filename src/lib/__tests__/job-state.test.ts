import { describe, expect, it } from 'vitest';
import { canCancel, canTransition, describeJob, isTerminal, shouldRefund } from '../job-state';
import type { JobStatus } from '../types';

const ALL: JobStatus[] = ['queued', 'running', 'completed', 'failed', 'cancelled'];

describe('isTerminal', () => {
  it.each(['completed', 'failed', 'cancelled'] as JobStatus[])('%s is terminal', (status) => {
    expect(isTerminal(status)).toBe(true);
  });

  it.each(['queued', 'running'] as JobStatus[])('%s is not terminal', (status) => {
    expect(isTerminal(status)).toBe(false);
  });
});

describe('canTransition', () => {
  it('lets a queued job start running', () => {
    expect(canTransition('queued', 'running')).toBe(true);
  });

  it('lets a running job be requeued after a lease timeout', () => {
    expect(canTransition('running', 'queued')).toBe(true);
  });

  it('never leaves a terminal state', () => {
    for (const from of ['completed', 'failed', 'cancelled'] as JobStatus[]) {
      for (const to of ALL) {
        expect(canTransition(from, to)).toBe(false);
      }
    }
  });

  it('cannot complete straight from the queue without running', () => {
    expect(canTransition('queued', 'completed')).toBe(false);
  });
});

describe('canCancel', () => {
  it('allows cancelling a job that is still running', () => {
    expect(canCancel({ status: 'running', cancel_requested: false })).toBe(true);
  });

  it('refuses a second cancel while the first is in flight', () => {
    expect(canCancel({ status: 'running', cancel_requested: true })).toBe(false);
  });

  it('refuses to cancel a finished job', () => {
    expect(canCancel({ status: 'completed', cancel_requested: false })).toBe(false);
  });
});

describe('shouldRefund', () => {
  it('refunds a cancelled job', () => {
    expect(shouldRefund('cancelled')).toBe(true);
  });

  it('refunds a failed job', () => {
    expect(shouldRefund('failed')).toBe(true);
  });

  it('keeps the charge for a completed job', () => {
    expect(shouldRefund('completed')).toBe(false);
  });
});

describe('describeJob', () => {
  it('reports cancellation in progress ahead of the stale stage message', () => {
    expect(
      describeJob({
        status: 'running',
        cancel_requested: true,
        status_message: 'Mixing audio…',
      }),
    ).toBe('Cancelling…');
  });

  it('falls back when the server sent no message', () => {
    expect(describeJob({ status: 'queued', cancel_requested: false, status_message: '' })).toBe(
      'Working…',
    );
  });
});
