// POST /generate — debit credits and enqueue a job, then nudge the worker.
//
// The debit and the job row are created in one database transaction, so a
// caller can never be charged for a job that does not exist, or get a job that
// was never paid for.

import { handle, json, requireUser, translatePgError, HttpError } from '../_shared/http.ts';

const MAX_SECONDS = 180;

Deno.serve((req) =>
  handle(req, async () => {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Use POST.');

    const { client } = await requireUser(req);
    const body = await req.json().catch(() => ({}));

    const prompt = String(body.prompt ?? '').trim();
    const style = String(body.style ?? '').trim();
    const instrumental = Boolean(body.instrumental);
    const seconds = Math.min(Math.max(Number(body.seconds) || 45, 15), MAX_SECONDS);
    const projectId = body.projectId ?? null;

    // The client supplies this so a retried request (double click, flaky
    // network) resolves to the same job instead of charging twice.
    const idempotencyKey =
      req.headers.get('x-idempotency-key') ?? body.idempotencyKey ?? crypto.randomUUID();

    const { data, error } = await client.rpc('enqueue_generation', {
      p_prompt: prompt,
      p_params: { style, instrumental, seconds },
      p_project_id: projectId,
      p_idempotency_key: idempotencyKey,
    });

    if (error) throw translatePgError(error);

    const job = Array.isArray(data) ? data[0] : data;

    // Kick the worker without making the caller wait for the song.
    const wake = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/worker`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger: 'generate', jobId: job?.id }),
    }).catch((err) => console.error('worker wake failed', err));

    // @ts-expect-error EdgeRuntime is only present on Supabase's runtime.
    if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(wake);

    return json(req, { job });
  }),
);
