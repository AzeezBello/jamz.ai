// POST /download-url — mint a short-lived signed URL for a master.
//
// The audio bucket is private. Read permission is decided by querying as the
// caller (so RLS answers the question), and only then does the service client
// sign the object. Anonymous callers are allowed through deliberately: RLS
// still hides private songs, and shared links must play for logged-out
// visitors.

import {
  handle,
  json,
  serviceClient,
  toPublicUrl,
  userClient,
  HttpError,
} from '../_shared/http.ts';

const SIGNED_URL_TTL_SECONDS = 300;

Deno.serve((req) =>
  handle(req, async () => {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Use POST.');

    const client = userClient(req);
    const body = await req.json().catch(() => ({}));
    const songId = String(body.songId ?? '');
    const asAttachment = body.download !== false;

    if (!songId) throw new HttpError(400, 'bad_request', 'songId is required.');

    // RLS decides visibility here: owner, or a public/unlisted song.
    const { data: song, error: songError } = await client
      .from('songs')
      .select('id, title, audio_assets(id, storage_path, format, kind)')
      .eq('id', songId)
      .is('deleted_at', null)
      .single();

    if (songError || !song) {
      throw new HttpError(404, 'song_not_found', 'That song is not available.');
    }

    const master =
      (song.audio_assets ?? []).find((a: { kind: string }) => a.kind === 'master') ??
      (song.audio_assets ?? [])[0];

    if (!master) throw new HttpError(404, 'asset_missing', 'No audio file for this song yet.');

    const safeTitle =
      String(song.title)
        .replace(/[^\w\s.-]+/g, '')
        .trim() || 'jamz-track';
    const { data, error } = await serviceClient()
      .storage.from('audio')
      .createSignedUrl(master.storage_path, SIGNED_URL_TTL_SECONDS, {
        download: asAttachment ? `${safeTitle}.${master.format}` : undefined,
      });

    if (error || !data) {
      throw new HttpError(500, 'sign_failed', error?.message ?? 'Could not sign the file.');
    }

    return json(req, { url: toPublicUrl(data.signedUrl), expiresIn: SIGNED_URL_TTL_SECONDS });
  }),
);
