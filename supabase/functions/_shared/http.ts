// Shared HTTP helpers for every edge function: CORS, JSON envelopes, and
// resolving the caller from their Authorization header.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allow = ALLOWED_ORIGINS.includes('*')
    ? '*'
    : ALLOWED_ORIGINS.includes(origin)
      ? origin
      : (ALLOWED_ORIGINS[0] ?? '');

  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-idempotency-key',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders(req) }) : null;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Postgres exceptions carry our error codes in the message; surface them cleanly. */
export function translatePgError(err: { message?: string } | null): HttpError {
  const message = err?.message ?? 'Unexpected database error';
  const known: Record<string, [number, string]> = {
    not_authenticated: [401, 'not_authenticated'],
    insufficient_credits: [402, 'insufficient_credits'],
    concurrency_limit: [429, 'concurrency_limit'],
    invalid_prompt: [400, 'invalid_prompt'],
    job_not_found: [404, 'job_not_found'],
    song_not_found: [404, 'song_not_found'],
  };
  for (const [needle, [status, code]] of Object.entries(known)) {
    if (message.includes(needle)) {
      return new HttpError(status, code, message.split(':').slice(1).join(':').trim() || message);
    }
  }
  return new HttpError(500, 'internal_error', message);
}

/**
 * Storage signs URLs against whatever base the client was built with, which
 * inside a self-hosted stack is an internal address (e.g. http://kong:8000)
 * that no browser can reach. Hosted Supabase sets SUPABASE_URL to the public
 * project URL, so this is a no-op there; set PUBLIC_SUPABASE_URL when the two
 * differ.
 */
export function toPublicUrl(signedUrl: string): string {
  const publicBase = Deno.env.get('PUBLIC_SUPABASE_URL');
  if (!publicBase) return signedUrl;

  try {
    const url = new URL(signedUrl);
    const target = new URL(publicBase);
    url.protocol = target.protocol;
    url.host = target.host;
    return url.toString();
  } catch {
    return signedUrl;
  }
}

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A client that acts *as the caller*, so RLS applies to everything it does. */
export function userClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(req: Request) {
  const client = userClient(req);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new HttpError(401, 'not_authenticated', 'Sign in to continue.');
  }
  return { client, user: data.user };
}

export async function handle(req: Request, fn: () => Promise<Response>): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) {
      return json(req, { error: { code: err.code, message: err.message } }, err.status);
    }
    console.error('unhandled', err);
    return json(req, { error: { code: 'internal_error', message: 'Something went wrong.' } }, 500);
  }
}
