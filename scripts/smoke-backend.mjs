#!/usr/bin/env node
/**
 * End-to-end backend smoke test.
 *
 * Drives the deployed edge functions over HTTP the way the browser does:
 * sign up, generate, poll, download, cancel. This is the layer the database
 * suites cannot reach — it is the only thing that actually executes the Deno
 * functions, the storage upload and the signed-URL path.
 *
 *   node scripts/smoke-backend.mjs
 *
 * Defaults target the local stack from `npm run db:start`. Override with
 * SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.
 */

const URL_BASE = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON = process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const GENERATION_COST = 5;
// Multi-line on purpose: line breaks must survive the round trip.
const LYRICS = 'Salt on the window\nlight on the water\nwe drove until morning';
let failures = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function api(path, { token, method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${URL_BASE}${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token ?? ANON}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  return { status: response.status, ok: response.ok, json, text };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Creates a pre-confirmed user with the service key, then signs in as them. */
async function createUser(label) {
  const email = `smoke-${label}-${Date.now()}@jamz.test`;
  const password = 'smoke-password-123!';

  const created = await api('/auth/v1/admin/users', {
    token: SERVICE,
    method: 'POST',
    body: { email, password, email_confirm: true, user_metadata: { display_name: `Smoke ${label}` } },
  });
  if (!created.ok) throw new Error(`admin create failed: ${created.status} ${created.text}`);

  const signedIn = await api('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });
  if (!signedIn.ok) throw new Error(`sign-in failed: ${signedIn.status} ${signedIn.text}`);

  return { email, id: created.json.id, token: signedIn.json.access_token };
}

async function credits(user) {
  const res = await api(`/rest/v1/profiles?select=credit_balance&id=eq.${user.id}`, { token: user.token });
  return res.json?.[0]?.credit_balance ?? null;
}

async function pollJob(user, jobId, { timeoutMs = 120_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const res = await api(`/rest/v1/generation_jobs?select=*&id=eq.${jobId}`, { token: user.token });
    last = res.json?.[0] ?? last;
    if (last && ['completed', 'failed', 'cancelled'].includes(last.status)) return last;
    await sleep(1500);
  }
  return last;
}

async function main() {
  console.log(`Backend smoke test against ${URL_BASE}\n`);

  // -------------------------------------------------------------------------
  console.log('1. signup provisions credits');
  const alice = await createUser('alice');
  const startingCredits = await credits(alice);
  check('new account starts with 50 credits', startingCredits === 50, `got ${startingCredits}`);

  // -------------------------------------------------------------------------
  console.log('\n2. generation runs end to end');
  const started = await api('/functions/v1/generate', {
    token: alice.token,
    method: 'POST',
    body: {
      prompt: 'a bright summer synth pop song about the sea',
      seconds: 15,
      lyrics: LYRICS,
    },
  });
  check('generate returns 200', started.ok, `${started.status} ${started.text.slice(0, 200)}`);
  const job = started.json?.job;
  check('a job was created', Boolean(job?.id));
  if (!job?.id) throw new Error('no job to follow');

  check('credits were debited immediately',
    (await credits(alice)) === startingCredits - GENERATION_COST);

  const finished = await pollJob(alice, job.id);
  check('job reached completed', finished?.status === 'completed',
    `status=${finished?.status} error=${finished?.error_message ?? ''}`);
  check('progress reached 100', finished?.progress === 100, `got ${finished?.progress}`);
  check('job is linked to a song', Boolean(finished?.song_id));

  // -------------------------------------------------------------------------
  console.log('\n3. the song and its audio exist');
  const songRes = await api(
    `/rest/v1/songs?select=*,audio_assets(*)&id=eq.${finished?.song_id}`, { token: alice.token });
  const song = songRes.json?.[0];
  check('song row is readable by its owner', Boolean(song));
  check('song defaults to private', song?.visibility === 'private', `got ${song?.visibility}`);
  check('duration was recorded', song?.duration_seconds > 0, `got ${song?.duration_seconds}`);
  check('an audio asset was written', (song?.audio_assets ?? []).length === 1);
  // The studio collected lyrics and the pipeline used to drop them: they were
  // written into generation_jobs.params and never copied onto the song.
  check('the lyrics were kept', song?.lyrics === LYRICS, `got ${JSON.stringify(song?.lyrics)}`);
  check('asset has a non-trivial size', (song?.audio_assets?.[0]?.bytes ?? 0) > 10_000,
    `got ${song?.audio_assets?.[0]?.bytes}`);

  // -------------------------------------------------------------------------
  console.log('\n4. download yields a real, decodable file');
  const signed = await api('/functions/v1/download-url', {
    token: alice.token, method: 'POST', body: { songId: song?.id },
  });
  check('download-url returns 200', signed.ok, `${signed.status} ${signed.text.slice(0, 200)}`);
  check('a signed url came back', typeof signed.json?.url === 'string');

  if (signed.json?.url) {
    // A reachable URL is part of what is being tested: if SUPABASE_URL is an
    // internal address and PUBLIC_SUPABASE_URL is unset, this is exactly the
    // bug that makes every download link dead for real users.
    let file = null;
    try {
      file = await fetch(signed.json.url);
    } catch (err) {
      check('the signed url is reachable', false, `${signed.json.url} — ${err.message}`);
    }
  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    check('the file downloads', file.ok, `status ${file.status}`);
    check('it is a RIFF/WAVE container',
      buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WAVE');
    const declared = buffer.readUInt32LE(40);
    check('the declared data chunk matches the payload', declared === buffer.length - 44,
      `declared ${declared}, actual ${buffer.length - 44}`);
    check('served as an attachment',
      (file.headers.get('content-disposition') ?? '').includes('attachment'));

    let peak = 0;
    for (let i = 44; i < buffer.length - 1; i += 2) peak = Math.max(peak, Math.abs(buffer.readInt16LE(i)));
    check('the audio is not silence', peak > 1000, `peak ${peak}`);
  }
  }

  // -------------------------------------------------------------------------
  console.log('\n5. a private song is not readable by anyone else');
  const bob = await createUser('bob');
  const asBob = await api(`/rest/v1/songs?select=id&id=eq.${song?.id}`, { token: bob.token });
  check('another user gets no rows', (asBob.json ?? []).length === 0);
  const anon = await api(`/rest/v1/songs?select=id&id=eq.${song?.id}`);
  check('an anonymous visitor gets no rows', (anon.json ?? []).length === 0);
  const bobDownload = await api('/functions/v1/download-url', {
    token: bob.token, method: 'POST', body: { songId: song?.id },
  });
  check('another user cannot mint a signed url', bobDownload.status === 404,
    `got ${bobDownload.status}`);

  // -------------------------------------------------------------------------
  console.log('\n6. cancelling refunds and produces no song');
  const before = await credits(alice);
  const second = await api('/functions/v1/generate', {
    token: alice.token, method: 'POST',
    body: { prompt: 'a long ambient drone that will be cancelled', seconds: 60 },
  });
  const cancelJob = second.json?.job;
  check('second generation started', Boolean(cancelJob?.id),
    `${second.status} ${second.text.slice(0, 200)}`);

  if (cancelJob?.id) {
    await sleep(1200);   // let the worker pick it up so this is a running cancel
    const cancelled = await api('/rest/v1/rpc/request_cancel_generation', {
      token: alice.token, method: 'POST', body: { p_job_id: cancelJob.id },
    });
    check('cancel request accepted', cancelled.ok, `${cancelled.status} ${cancelled.text.slice(0, 200)}`);

    const settled = await pollJob(alice, cancelJob.id, { timeoutMs: 60_000 });
    check('job reached cancelled', settled?.status === 'cancelled', `status=${settled?.status}`);
    check('credits were refunded', (await credits(alice)) === before,
      `expected ${before}, got ${await credits(alice)}`);
    check('no song was produced', !settled?.song_id);
  }

  // -------------------------------------------------------------------------
  console.log('\n7. insufficient credits are refused');
  const broke = await createUser('broke');
  await api('/rest/v1/rpc/apply_credit_delta', {
    token: SERVICE, method: 'POST',
    body: { p_user_id: broke.id, p_delta: -50, p_reason: 'smoke_drain',
            p_ref_type: null, p_ref_id: null, p_idempotency_key: `drain:${broke.id}` },
  });
  check('balance drained to zero', (await credits(broke)) === 0);
  const refused = await api('/functions/v1/generate', {
    token: broke.token, method: 'POST', body: { prompt: 'this should not be affordable', seconds: 15 },
  });
  check('generate refuses with 402', refused.status === 402, `got ${refused.status} ${refused.text.slice(0, 160)}`);
  check('error code is insufficient_credits',
    refused.json?.error?.code === 'insufficient_credits', `got ${refused.json?.error?.code}`);

  // -------------------------------------------------------------------------
  console.log('\n8. AI lyrics are written and metered');
  const lyricist = await createUser('lyricist');
  const beforeLyrics = await credits(lyricist);

  const written = await api('/functions/v1/generate-lyrics', {
    token: lyricist.token,
    method: 'POST',
    body: { prompt: 'a defiant song about leaving a small town', style: 'indie rock' },
  });
  check('generate-lyrics returns 200', written.ok, `${written.status} ${written.text.slice(0, 200)}`);
  check('a title came back', Boolean(written.json?.title));
  check('lyrics have several lines', (written.json?.lyrics ?? '').split('\n').length > 6);
  check('section markers are present', /\[(Verse|Chorus)/.test(written.json?.lyrics ?? ''));
  check('one credit was charged', (await credits(lyricist)) === beforeLyrics - 1,
    `expected ${beforeLyrics - 1}, got ${await credits(lyricist)}`);

  // Replaying the same idempotency key must not charge again.
  const balanceAfterFirst = await credits(lyricist);
  await api('/functions/v1/generate-lyrics', {
    token: lyricist.token,
    method: 'POST',
    headers: { 'x-idempotency-key': 'smoke-fixed-key' },
    body: { prompt: 'a defiant song about leaving a small town' },
  });
  await api('/functions/v1/generate-lyrics', {
    token: lyricist.token,
    method: 'POST',
    headers: { 'x-idempotency-key': 'smoke-fixed-key' },
    body: { prompt: 'a defiant song about leaving a small town' },
  });
  check('a replayed request is charged once', (await credits(lyricist)) === balanceAfterFirst - 1,
    `expected ${balanceAfterFirst - 1}, got ${await credits(lyricist)}`);

  // A different user replaying the same key must still be charged: keys are
  // scoped per user, so one account cannot spend against another's.
  const freeloader = await createUser('freeloader');
  const freeloaderBefore = await credits(freeloader);
  await api('/functions/v1/generate-lyrics', {
    token: freeloader.token,
    method: 'POST',
    headers: { 'x-idempotency-key': 'smoke-fixed-key' },
    body: { prompt: 'a defiant song about leaving a small town' },
  });
  check(
    "another user's identical key is still charged",
    (await credits(freeloader)) === freeloaderBefore - 1,
    `expected ${freeloaderBefore - 1}, got ${await credits(freeloader)}`,
  );

  const shortBrief = await api('/functions/v1/generate-lyrics', {
    token: lyricist.token, method: 'POST', body: { prompt: 'x' },
  });
  check('an empty brief is refused with 400', shortBrief.status === 400, `got ${shortBrief.status}`);

  // -------------------------------------------------------------------------
  console.log('\n9. model choice is a plan entitlement');
  const freeUser = await createUser('freeplan');

  const overreach = await api('/functions/v1/generate', {
    token: freeUser.token,
    method: 'POST',
    body: { prompt: 'a song on a model I have not paid for', seconds: 15, model: 'v5' },
  });
  // The pricing page sells v5 as a paid feature, so asking for it on Free must
  // be refused by the server, not merely hidden in the UI.
  check('a free plan cannot select v5', !overreach.ok, `got ${overreach.status}`);
  check('the refusal names the reason',
    /model_not_available|not included in your plan/.test(overreach.text),
    overreach.text.slice(0, 160));
  check('no credits were taken for the refusal', (await credits(freeUser)) === 50,
    `got ${await credits(freeUser)}`);

  const allowed = await api('/functions/v1/generate', {
    token: freeUser.token,
    method: 'POST',
    body: { prompt: 'a song on the model I do have', seconds: 15, model: 'v4.5' },
  });
  check('the plan\'s own model is accepted', allowed.ok, `${allowed.status} ${allowed.text.slice(0, 160)}`);

  // -------------------------------------------------------------------------
  console.log('\n10. the worker is not callable from the browser');
  const worker = await api('/functions/v1/worker', {
    token: alice.token, method: 'POST', body: {},
  });
  check('worker rejects a user token with 403', worker.status === 403, `got ${worker.status}`);

  console.log(`\n${failures === 0 ? 'ALL BACKEND CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
