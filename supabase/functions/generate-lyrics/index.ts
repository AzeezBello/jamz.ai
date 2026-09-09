// POST /generate-lyrics — write a lyric for a brief, before the song is made.
//
// Metered like everything else that costs money: one credit, charged up front
// and refunded if the writer fails, so a user is never billed for words they
// did not get.

import { handle, json, requireUser, translatePgError, HttpError } from '../_shared/http.ts';
import { writeLyrics } from '../_shared/lyrics.ts';

const MAX_PROMPT = 2000;

Deno.serve((req) =>
  handle(req, async () => {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Use POST.');

    const { client } = await requireUser(req);
    const body = await req.json().catch(() => ({}));

    const prompt = String(body.prompt ?? '')
      .trim()
      .slice(0, MAX_PROMPT);
    const style = String(body.style ?? '')
      .trim()
      .slice(0, MAX_PROMPT);
    const existing = String(body.existing ?? '')
      .trim()
      .slice(0, MAX_PROMPT);

    if (prompt.length < 3) {
      throw new HttpError(
        400,
        'invalid_prompt',
        'Describe the song first — a mood, a story, or a subject.',
      );
    }

    // One key covers the debit and its refund, so a retried request cannot be
    // charged twice or refunded twice.
    const idempotencyKey =
      req.headers.get('x-idempotency-key') ?? body.idempotencyKey ?? crypto.randomUUID();

    const { error: debitError } = await client.rpc('debit_lyrics_credit', {
      p_idempotency_key: `lyrics:${idempotencyKey}`,
    });
    if (debitError) throw translatePgError(debitError);

    try {
      const result = await writeLyrics({ prompt, style, existing: existing || undefined });
      return json(req, result);
    } catch (err) {
      // Give the credit back before surfacing the failure.
      await client
        .rpc('refund_lyrics_credit', { p_idempotency_key: `lyrics:${idempotencyKey}` })
        .catch(() => {});

      console.error('lyrics generation failed', err);
      throw new HttpError(
        502,
        'lyrics_failed',
        err instanceof Error && /declined/.test(err.message)
          ? err.message
          : 'The lyric writer is unavailable right now. Your credit has been returned.',
      );
    }
  }),
);
