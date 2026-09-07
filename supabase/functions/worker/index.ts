// The generation worker.
//
// Claims queued jobs one at a time under a lease, streams progress into the
// row (which the client watches over realtime), and honours cancellation
// between stages. Every terminal path either produces a song or refunds.

import { corsHeaders, json, serviceClient } from '../_shared/http.ts';
import { CancelledError, getProvider, titleFromPrompt } from '../_shared/providers.ts';

const LEASE_SECONDS = 180;
// Leave headroom under the platform's wall-clock limit so an in-flight job
// finishes rather than being killed mid-upload.
const TIME_BUDGET_MS = 110_000;

function isServiceCaller(req: Request): boolean {
  const auth = req.headers.get('Authorization') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return key.length > 0 && auth === `Bearer ${key}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (!isServiceCaller(req)) {
    return json(req, { error: { code: 'forbidden', message: 'Worker is internal.' } }, 403);
  }

  const db = serviceClient();
  const workerId = crypto.randomUUID();
  const startedAt = Date.now();
  const processed: string[] = [];

  // Recover anything whose worker died before draining the queue.
  await db.rpc('reap_stalled_jobs');

  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    const { data: claimed, error: claimError } = await db.rpc('claim_generation_job', {
      p_worker_id: workerId,
      p_lease_seconds: LEASE_SECONDS,
    });

    if (claimError) {
      console.error('claim failed', claimError);
      break;
    }

    const job = Array.isArray(claimed) ? claimed[0] : claimed;
    if (!job) break; // queue drained

    try {
      await runJob(db, job);
      processed.push(job.id);
    } catch (err) {
      console.error('job failed', job.id, err);
      await db.rpc('fail_generation_job', {
        p_job_id: job.id,
        p_code: 'provider_error',
        p_message: err instanceof Error ? err.message.slice(0, 500) : 'Generation failed.',
      });
    }
  }

  return json(req, { workerId, processed: processed.length, jobs: processed });
});

// deno-lint-ignore no-explicit-any
async function runJob(db: any, job: any) {
  const provider = getProvider();
  const params = job.params ?? {};

  const onProgress = async (percent: number, message: string): Promise<boolean> => {
    const { data, error } = await db.rpc('report_job_progress', {
      p_job_id: job.id,
      p_progress: percent,
      p_message: message,
      p_lease_seconds: LEASE_SECONDS,
    });
    // A missing row (job vanished) reads as cancelled, which is the safe side.
    if (error) {
      console.error('progress failed', error);
      return true;
    }
    return data === true;
  };

  let output;
  try {
    output = await provider.generate(
      {
        prompt: job.prompt,
        style: String(params.style ?? ''),
        seconds: Number(params.seconds ?? 45),
        instrumental: Boolean(params.instrumental),
      },
      onProgress,
    );
  } catch (err) {
    if (err instanceof CancelledError) {
      await db.rpc('finish_cancelled_job', { p_job_id: job.id });
      return;
    }
    throw err;
  }

  const path = `${job.user_id}/${job.id}.${output.extension}`;
  const { error: uploadError } = await db.storage
    .from('audio')
    .upload(path, output.bytes, { contentType: output.contentType, upsert: true });

  if (uploadError) throw new Error(`storage upload failed: ${uploadError.message}`);

  // Last cancellation check before we hand the user a finished song.
  if (await onProgress(98, 'Finalizing…')) {
    await db.storage.from('audio').remove([path]);
    await db.rpc('finish_cancelled_job', { p_job_id: job.id });
    return;
  }

  const { error: completeError } = await db.rpc('complete_generation_job', {
    p_job_id: job.id,
    p_title: titleFromPrompt(job.prompt),
    p_duration: output.durationSeconds,
    p_storage_path: path,
    p_bytes: output.bytes.byteLength,
    p_format: output.extension,
    p_cover_url: coverForJob(job.id),
    p_model: provider.id,
  });

  if (completeError) {
    await db.storage.from('audio').remove([path]);
    throw new Error(`completion failed: ${completeError.message}`);
  }
}

// Stand-in cover art until a cover-generation model is wired up: stable per
// job, so a song keeps the same artwork across reloads.
function coverForJob(jobId: string): string {
  let hash = 0;
  for (const ch of jobId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `/images/song-${(hash % 8) + 1}.jpg`;
}
