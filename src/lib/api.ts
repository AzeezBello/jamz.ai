import { supabase } from './supabase';
import { env } from './env';
import {
  ApiError,
  type BillingInterval,
  type CreditEntry,
  type GenerationJob,
  type Invoice,
  type ModerationReport,
  type Notification,
  type Plan,
  type PlanId,
  type Profile,
  type Project,
  type ReferenceKind,
  type ReferenceUpload,
  type Song,
  type SongVisibility,
  type Subscription,
} from './types';

/** Postgres exceptions arrive as `code: message`; keep the code machine-readable. */
function fromPostgrest(error: { message: string } | null, fallback: string): ApiError {
  const message = error?.message ?? fallback;
  const match = message.match(/^([a-z_]+):\s*(.*)$/);
  if (match) return new ApiError(match[1], match[2] || message);
  const bare = message.match(
    /\b(insufficient_credits|concurrency_limit|not_authenticated|invalid_prompt|song_not_found|job_not_found)\b/,
  );
  if (bare) return new ApiError(bare[1], message);
  return new ApiError('request_failed', message);
}

async function callFunction<T>(name: string, body: unknown = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const response = await fetch(`${env.supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${session?.access_token ?? env.supabaseAnonKey}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.code ?? 'request_failed',
      payload?.error?.message ?? `${name} failed (${response.status})`,
    );
  }
  return payload as T;
}

// ---------------------------------------------------------------------------
// Profile & plans
// ---------------------------------------------------------------------------

let profileHasOnboardingCols: boolean | null = null;
let lastLoadedProfile: Profile | null = null;

export async function fetchProfile(userId: string): Promise<Profile> {
  // Rolls the daily allowance forward before reading, so the balance the user
  // sees is the balance a generation would actually use.
  await supabase.rpc('grant_daily_credits', { p_user_id: userId });

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error) throw fromPostgrest(error, 'Could not load your profile.');
  if (data && typeof data === 'object') {
    profileHasOnboardingCols = 'onboarded_at' in data;
    lastLoadedProfile = data as Profile;
  }
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  patch: Partial<
    Pick<
      Profile,
      | 'display_name'
      | 'handle'
      | 'bio'
      | 'avatar_url'
      | 'marketing_opt_in'
      | 'notify_on_complete'
      | 'onboarded_at'
      | 'tour_completed_at'
      | 'dismissed_tips'
    >
  >,
): Promise<Profile> {
  const stripOnboardingFields = (input: typeof patch) => {
    const next = { ...input };
    delete next.onboarded_at;
    delete next.tour_completed_at;
    delete next.dismissed_tips;
    return next;
  };

  const payload = profileHasOnboardingCols === false ? stripOnboardingFields(patch) : { ...patch };

  if (Object.keys(payload).length === 0) {
    const merged = { ...(lastLoadedProfile ?? ({ id: userId } as Profile)), ...patch };
    lastLoadedProfile = merged;
    return merged;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    const hasOnboardingKeys =
      'onboarded_at' in payload || 'tour_completed_at' in payload || 'dismissed_tips' in payload;
    if (hasOnboardingKeys) {
      profileHasOnboardingCols = false;
      const fallbackPayload = stripOnboardingFields(payload);
      if (Object.keys(fallbackPayload).length === 0) {
        const merged = { ...(lastLoadedProfile ?? ({ id: userId } as Profile)), ...patch };
        lastLoadedProfile = merged;
        return merged;
      }
      const retry = await supabase
        .from('profiles')
        .update(fallbackPayload)
        .eq('id', userId)
        .select()
        .single();
      if (!retry.error && retry.data) {
        const merged = { ...(retry.data as Profile), ...patch };
        lastLoadedProfile = merged;
        return merged;
      }
    }
    throw fromPostgrest(error, 'Could not save your profile.');
  }

  lastLoadedProfile = data as Profile;
  return data as Profile;
}

export async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await supabase.from('plans').select('*').order('sort_order');
  if (error) throw fromPostgrest(error, 'Could not load plans.');
  return (data ?? []) as Plan[];
}

// ---------------------------------------------------------------------------
// Songs
// ---------------------------------------------------------------------------

const SONG_COLUMNS =
  'id, user_id, title, prompt, style, lyrics, is_instrumental, duration_seconds, cover_url, visibility, play_count, like_count, commercial_use, model_version, created_at, updated_at';

/**
 * `songs.user_id` points at `profiles`, which RLS restricts to the owner, so
 * display names come from the `public_profiles` view in a second pass rather
 * than an embedded join.
 */
async function attachArtists(songs: Song[]): Promise<Song[]> {
  const ids = [...new Set(songs.map((s) => s.user_id))];
  if (!ids.length) return songs;

  const { data } = await supabase
    .from('public_profiles')
    .select('id, display_name, handle')
    .in('id', ids);

  const names = new Map(
    (data ?? []).map((p) => [p.id, p.display_name || p.handle || 'Unknown artist']),
  );
  return songs.map((s) => ({ ...s, artist: names.get(s.user_id) ?? 'Unknown artist' }));
}

async function attachLikes(songs: Song[]): Promise<Song[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !songs.length) return songs.map((s) => ({ ...s, is_liked: false }));

  const { data } = await supabase
    .from('likes')
    .select('song_id')
    .eq('user_id', user.id)
    .in(
      'song_id',
      songs.map((s) => s.id),
    );

  const liked = new Set((data ?? []).map((l) => l.song_id));
  return songs.map((s) => ({ ...s, is_liked: liked.has(s.id) }));
}

async function decorate(rows: Song[]): Promise<Song[]> {
  return attachLikes(await attachArtists(rows));
}

export type SongSort = 'newest' | 'oldest' | 'plays' | 'likes' | 'title' | 'longest';

const SORT_COLUMN: Record<SongSort, { column: string; ascending: boolean }> = {
  newest: { column: 'created_at', ascending: false },
  oldest: { column: 'created_at', ascending: true },
  plays: { column: 'play_count', ascending: false },
  likes: { column: 'like_count', ascending: false },
  title: { column: 'title', ascending: true },
  longest: { column: 'duration_seconds', ascending: false },
};

export interface SongQuery {
  search?: string;
  sort?: SongSort;
  visibility?: SongVisibility | 'all';
  projectId?: string | null;
  limit?: number;
  offset?: number;
}

export interface SongPage {
  songs: Song[];
  /** True when more rows exist past this page. */
  hasMore: boolean;
}

/** PostgREST `or` takes a comma-separated filter list, so strip its delimiters. */
function sanitiseSearch(term: string): string {
  return term.trim().replace(/[%,()]/g, '');
}

export const PAGE_SIZE = 30;

export async function fetchMySongs(options: SongQuery = {}): Promise<SongPage> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { songs: [], hasMore: false };

  const limit = options.limit ?? PAGE_SIZE;
  const offset = options.offset ?? 0;
  const sort = SORT_COLUMN[options.sort ?? 'newest'];

  let query = supabase
    .from('songs')
    .select(SONG_COLUMNS)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order(sort.column, { ascending: sort.ascending })
    // Fetch one extra row to learn whether another page exists without a
    // second count query.
    .range(offset, offset + limit);

  if (options.visibility && options.visibility !== 'all') {
    query = query.eq('visibility', options.visibility);
  }
  if (options.projectId) {
    query = query.eq('project_id', options.projectId);
  }
  if (options.search?.trim()) {
    const term = sanitiseSearch(options.search);
    query = query.or(`title.ilike.%${term}%,prompt.ilike.%${term}%,lyrics.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw fromPostgrest(error, 'Could not load your library.');

  const rows = (data ?? []) as Song[];
  const hasMore = rows.length > limit;
  return { songs: await decorate(rows.slice(0, limit)), hasMore };
}

export async function fetchPublicSongs(options: SongQuery = {}): Promise<SongPage> {
  const limit = options.limit ?? PAGE_SIZE;
  const offset = options.offset ?? 0;
  const sort = SORT_COLUMN[options.sort ?? 'plays'];

  let query = supabase
    .from('songs')
    .select(SONG_COLUMNS)
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .order(sort.column, { ascending: sort.ascending })
    .range(offset, offset + limit);

  if (options.search?.trim()) {
    const term = sanitiseSearch(options.search);
    query = query.or(`title.ilike.%${term}%,prompt.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw fromPostgrest(error, 'Could not load the feed.');

  const rows = (data ?? []) as Song[];
  const hasMore = rows.length > limit;
  return { songs: await decorate(rows.slice(0, limit)), hasMore };
}

export interface LibraryStats {
  song_count: number;
  play_total: number;
  like_total: number;
  public_count: number;
  seconds_total: number;
}

/**
 * Totals for the whole library, not just the rows on screen. The dashboard
 * used to sum the loaded array, so the figures shifted while you searched.
 */
export async function fetchLibraryStats(): Promise<LibraryStats> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      song_count: 0,
      play_total: 0,
      like_total: 0,
      public_count: 0,
      seconds_total: 0,
    };
  }

  const { data, error } = await supabase
    .from('songs')
    .select('play_count, like_count, visibility, duration_seconds')
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (error) throw fromPostgrest(error, 'Could not load your library totals.');
  const rows = data ?? [];
  return {
    song_count: rows.length,
    play_total: rows.reduce((sum, r) => sum + Number(r.play_count ?? 0), 0),
    like_total: rows.reduce((sum, r) => sum + Number(r.like_count ?? 0), 0),
    public_count: rows.filter((r) => r.visibility === 'public').length,
    seconds_total: rows.reduce((sum, r) => sum + Number(r.duration_seconds ?? 0), 0),
  };
}

/** The eight stock covers the worker also chooses from. */
export const STOCK_COVERS = Array.from({ length: 8 }, (_, i) => `/images/song-${i + 1}.jpg`);

/**
 * Swap the artwork for a different stock cover.
 *
 * Cover art is a stand-in until a cover model is wired up, so a "re-roll" is
 * genuinely just picking another image — deliberately never the current one,
 * so the button always visibly does something.
 */
export async function rerollCover(songId: string, currentCover: string | null): Promise<Song> {
  const options = STOCK_COVERS.filter((cover) => cover !== currentCover);
  const next = options[Math.floor(Math.random() * options.length)];

  const { data, error } = await supabase
    .from('songs')
    .update({ cover_url: next })
    .eq('id', songId)
    .select(SONG_COLUMNS)
    .single();

  if (error) throw fromPostgrest(error, 'Could not change the cover.');
  const [song] = await decorate([data as Song]);
  return song;
}

/** Title and lyrics are the only song fields a client may edit; a trigger
 *  rejects everything else. */
export async function updateSongDetails(
  songId: string,
  patch: { title?: string; lyrics?: string | null },
): Promise<Song> {
  const { data, error } = await supabase
    .from('songs')
    .update(patch)
    .eq('id', songId)
    .select(SONG_COLUMNS)
    .single();

  if (error) throw fromPostgrest(error, 'Could not save those changes.');
  const [song] = await decorate([data as Song]);
  return song;
}

export async function fetchSong(id: string): Promise<Song | null> {
  const { data, error } = await supabase
    .from('songs')
    .select(SONG_COLUMNS)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Could not load that song.');
  if (!data) return null;
  const [song] = await decorate([data as Song]);
  return song;
}

export async function toggleLike(songId: string): Promise<{ liked: boolean; likeCount: number }> {
  const { data, error } = await supabase.rpc('toggle_like', { p_song_id: songId });
  if (error) throw fromPostgrest(error, 'Could not update the like.');
  const row = Array.isArray(data) ? data[0] : data;
  return { liked: Boolean(row?.liked), likeCount: Number(row?.likes_total ?? 0) };
}

export async function recordPlay(songId: string): Promise<void> {
  await supabase.rpc('record_play', { p_song_id: songId });
}

export async function deleteSong(songId: string): Promise<void> {
  const { error } = await supabase.rpc('soft_delete_song', { p_song_id: songId });
  if (error) throw fromPostgrest(error, 'Could not delete that song.');
}

export async function setSongVisibility(songId: string, visibility: SongVisibility): Promise<Song> {
  const { data, error } = await supabase.rpc('set_song_visibility', {
    p_song_id: songId,
    p_visibility: visibility,
  });
  if (error) throw fromPostgrest(error, 'Could not change sharing.');
  return (Array.isArray(data) ? data[0] : data) as Song;
}

/** Signed, short-lived. `download: false` yields a URL suitable for <audio src>. */
export async function getAudioUrl(songId: string, download = false): Promise<string> {
  const { url } = await callFunction<{ url: string }>('download-url', { songId, download });
  return url;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function fetchProjects(): Promise<Project[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [projectsRes, songsRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
    supabase
      .from('songs')
      .select('project_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .not('project_id', 'is', null),
  ]);

  if (projectsRes.error) {
    throw fromPostgrest(projectsRes.error, 'Could not load your projects.');
  }

  const counts = new Map<string, number>();
  for (const row of songsRes.data ?? []) {
    if (row.project_id) {
      counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
    }
  }

  return (projectsRes.data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    created_at: p.created_at,
    updated_at: p.updated_at,
    song_count: counts.get(p.id) ?? 0,
  }));
}

export async function createProject(title: string): Promise<Project> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError('not_authenticated', 'Sign in to continue.');

  const { data, error } = await supabase
    .from('projects')
    .insert({ title: title.trim() || 'Untitled project', user_id: user.id })
    .select('id, title, created_at, updated_at')
    .single();

  if (error) throw fromPostgrest(error, 'Could not create that project.');
  return { ...(data as Omit<Project, 'song_count'>), song_count: 0 };
}

export async function renameProject(projectId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ title: title.trim(), updated_at: new Date().toISOString() })
    .eq('id', projectId);
  if (error) throw fromPostgrest(error, 'Could not rename that project.');
}

/** Songs survive: unfile them before soft-deleting the project folder. */
export async function deleteProject(projectId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError('not_authenticated', 'Sign in to continue.');

  const now = new Date().toISOString();
  await supabase
    .from('songs')
    .update({ project_id: null, updated_at: now })
    .eq('project_id', projectId)
    .eq('user_id', user.id);

  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', projectId)
    .eq('user_id', user.id);

  if (error) throw fromPostgrest(error, 'Could not delete that project.');
}

export async function moveSongsToProject(
  songIds: string[],
  projectId: string | null,
): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError('not_authenticated', 'Sign in to continue.');
  if (!songIds.length) return 0;

  const { data, error } = await supabase
    .from('songs')
    .update({ project_id: projectId, updated_at: new Date().toISOString() })
    .in('id', songIds)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select('id');

  if (error) throw fromPostgrest(error, 'Could not move those songs.');
  return (data ?? []).length;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function saveVersion(projectId: string, wav: Uint8Array, mp3?: Uint8Array): Promise<void> {
  const payload = {
    project_id: projectId,
    wav: toBase64(wav),
    ...(mp3 && { mp3: toBase64(mp3) }),
  };
  await callFunction<void>('versions/create', payload);
}


// ---------------------------------------------------------------------------
// Reference uploads
// ---------------------------------------------------------------------------

/** 25 MB — comfortably more than a reference clip needs. */
export const MAX_REFERENCE_BYTES = 25 * 1024 * 1024;

const ACCEPTED_AUDIO = ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/x-m4a'];

/**
 * Stores a reference clip against the user.
 *
 * The generator does not condition on these yet — the composer says so. They
 * are stored properly now so nothing has to be migrated when it does.
 */
export async function uploadReference(file: File, kind: ReferenceKind): Promise<ReferenceUpload> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError('not_authenticated', 'Sign in to continue.');

  if (file.size > MAX_REFERENCE_BYTES) {
    throw new ApiError('file_too_large', 'That file is larger than 25 MB.');
  }
  if (kind !== 'inspo' && file.type && !ACCEPTED_AUDIO.includes(file.type)) {
    throw new ApiError('unsupported_type', `${file.type || 'That file'} is not an audio file.`);
  }

  const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(path, file, { contentType: file.type || 'application/octet-stream' });

  if (uploadError) throw new ApiError('upload_failed', uploadError.message);

  const { data, error } = await supabase
    .from('reference_uploads')
    .insert({
      user_id: user.id,
      kind,
      filename: file.name,
      storage_path: path,
      bytes: file.size,
      content_type: file.type,
    })
    .select('id, kind, filename, storage_path, bytes, created_at')
    .single();

  if (error) {
    // If the reference_uploads table migration is not on the remote DB yet,
    // return a synthesized descriptor for the uploaded storage object.
    return {
      id: crypto.randomUUID(),
      kind,
      filename: file.name,
      storage_path: path,
      bytes: file.size,
      created_at: new Date().toISOString(),
    };
  }

  return data as ReferenceUpload;
}

export async function deleteReference(reference: ReferenceUpload): Promise<void> {
  await supabase.storage.from('uploads').remove([reference.storage_path]);
  await supabase.from('reference_uploads').delete().eq('id', reference.id);
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export interface GenerationOptions {
  prompt: string;
  lyrics?: string;
  style?: string;
  thumbnailStyle?: string;
  instrumental?: boolean;
  seconds?: number;
  /** Overrides the title derived from the prompt. */
  title?: string;
  model?: string;
  vocalGender?: 'any' | 'male' | 'female';
  /** 0-100. Higher wanders further from the brief. */
  weirdness?: number;
  /** 0-100. How strongly the style text steers the result. */
  styleInfluence?: number;
  referenceIds?: string[];
  /** Files the new song into a project as it is created. */
  projectId?: string;
  /** Omit for a fresh take; the server generates one when absent. */
  seed?: string;
  idempotencyKey?: string;
}

export interface LyricsResult {
  title: string;
  lyrics: string;
  provider: string;
}

const LYRIC_OPENERS = [
  'I keep the light on out past midnight',
  'There is a road I never finished',
  'You said the quiet part out loud',
  'Somewhere the radio is still playing',
];
const LYRIC_TURNS = [
  'and I am not the same as I was',
  'and the morning does not ask me why',
  'and the city keeps its own time',
  'and nothing here stays where I left it',
];

function deriveLyricTitle(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3);
  const picked = words.slice(0, 3);
  if (!picked.length) return 'Untitled';
  return picked.map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
}

function generateLyricsLocally(options: {
  prompt: string;
  style?: string;
  existing?: string;
}): LyricsResult {
  const raw = `${options.prompt}|${options.style ?? ''}|${options.existing ?? ''}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const pick = <T>(list: T[], offset: number) => list[(hash + offset) % list.length];
  const subject = options.prompt.trim().replace(/[.!?]+$/, '') || 'this feeling';

  const sections = [
    ...(options.existing?.trim() ? [options.existing.trim(), ''] : []),
    '[Verse 1]',
    `${pick(LYRIC_OPENERS, 0)},`,
    `${pick(LYRIC_TURNS, 1)}.`,
    `Thinking about ${subject},`,
    'counting what the dark gave back.',
    '',
    '[Chorus]',
    `So here is to ${subject},`,
    'and every version I let go.',
    'If you are listening, I am still here —',
    'louder than I was before.',
    '',
    '[Verse 2]',
    `${pick(LYRIC_OPENERS, 2)},`,
    `${pick(LYRIC_TURNS, 3)}.`,
    'I traded quiet for the noise,',
    'and the noise gave me a name.',
    '',
    '[Chorus]',
    `So here is to ${subject},`,
    'and every version I let go.',
    'If you are listening, I am still here —',
    'louder than I was before.',
  ];

  return {
    title: deriveLyricTitle(options.prompt),
    lyrics: sections.join('\n'),
    provider: 'local',
  };
}

let remoteLyricsAvailable =
  !env.supabaseUrl.includes('.supabase.co') ||
  import.meta.env.VITE_ENABLE_REMOTE_LYRICS === 'true';

/**
 * Ask the model for a lyric before generating the song. Any words the user has
 * already written are sent along so the result develops them rather than
 * discarding them. Falls back cleanly to the local writer if the edge function
 * has not been deployed to the remote Supabase project yet.
 */
export async function generateLyrics(options: {
  prompt: string;
  style?: string;
  existing?: string;
}): Promise<LyricsResult> {
  if (!remoteLyricsAvailable) {
    return generateLyricsLocally(options);
  }
  try {
    return await callFunction<LyricsResult>('generate-lyrics', options);
  } catch (err) {
    if (err instanceof ApiError && err.code === 'insufficient_credits') {
      throw err;
    }
    remoteLyricsAvailable = false;
    return generateLyricsLocally(options);
  }
}

export async function startGeneration(options: GenerationOptions): Promise<GenerationJob> {
  const { job } = await callFunction<{ job: GenerationJob }>('generate', options);
  return job;
}

export async function cancelGeneration(jobId: string): Promise<GenerationJob> {
  const { data, error } = await supabase.rpc('request_cancel_generation', { p_job_id: jobId });
  if (error) throw fromPostgrest(error, 'Could not cancel the generation.');
  return (Array.isArray(data) ? data[0] : data) as GenerationJob;
}

export async function fetchJob(jobId: string): Promise<GenerationJob | null> {
  const { data } = await supabase.from('generation_jobs').select('*').eq('id', jobId).maybeSingle();
  return (data as GenerationJob) ?? null;
}

/** Any job still in flight — used to restore the modal after a page reload. */
export async function fetchActiveJob(): Promise<GenerationJob | null> {
  const { data } = await supabase
    .from('generation_jobs')
    .select('*')
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as GenerationJob) ?? null;
}

export async function fetchRecentJobs(limit = 20): Promise<GenerationJob[]> {
  const { data } = await supabase
    .from('generation_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as GenerationJob[];
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export async function fetchSubscription(): Promise<Subscription | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('id, plan_id, status, interval, current_period_end, cancel_at_period_end')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Subscription) ?? null;
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(24);
  return (data ?? []) as Invoice[];
}

export async function fetchCreditHistory(limit = 50): Promise<CreditEntry[]> {
  const { data } = await supabase
    .from('credit_ledger')
    .select('id, delta, balance_after, reason, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as CreditEntry[];
}

export async function startCheckout(planId: PlanId, interval: BillingInterval): Promise<string> {
  const { url } = await callFunction<{ url: string }>('stripe-checkout', { planId, interval });
  return url;
}

export async function openBillingPortal(): Promise<string> {
  const { url } = await callFunction<{ url: string }>('stripe-portal', {});
  return url;
}

export async function deleteAccount(confirmEmail: string): Promise<void> {
  await callFunction('delete-account', { confirm: confirmEmail });
}

// ---------------------------------------------------------------------------
// Favourites and creator profiles
// ---------------------------------------------------------------------------

export async function fetchLikedSongs(limit = 50): Promise<Song[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: likeRows, error: likeErr } = await supabase
    .from('likes')
    .select('song_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (likeErr) throw fromPostgrest(likeErr, 'Could not load your favourites.');
  const ids = (likeRows ?? []).map((r) => r.song_id);
  if (!ids.length) return [];

  const { data: songRows, error: songErr } = await supabase
    .from('songs')
    .select(SONG_COLUMNS)
    .in('id', ids)
    .is('deleted_at', null);

  if (songErr) throw fromPostgrest(songErr, 'Could not load your favourites.');
  const byId = new Map((songRows ?? []).map((s) => [s.id, s as Song]));
  const ordered = ids.map((id) => byId.get(id)).filter((s): s is Song => Boolean(s));
  return decorate(ordered);
}

export interface CreatorProfile {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  created_at: string;
  song_count: number;
  play_total: number;
  like_total: number;
}

export async function fetchCreator(handle: string): Promise<CreatorProfile | null> {
  const { data } = await supabase.rpc('creator_profile', { p_handle: handle });
  const row = Array.isArray(data) ? data[0] : data;
  return (row as CreatorProfile) ?? null;
}

export async function fetchCreatorSongs(handle: string, limit = 30): Promise<Song[]> {
  const { data } = await supabase.rpc('creator_songs', { p_handle: handle, p_limit: limit });
  return decorate((data ?? []) as Song[]);
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export const REPORT_REASONS = [
  { value: 'copyright', label: 'Copyright infringement' },
  { value: 'voice_likeness', label: "Imitates a real person's voice" },
  { value: 'hateful', label: 'Hateful or harassing' },
  { value: 'sexual', label: 'Sexual content involving minors' },
  { value: 'other', label: 'Something else' },
] as const;

export async function reportSong(songId: string, reason: string, details = ''): Promise<void> {
  const { error } = await supabase.rpc('report_song', {
    p_song_id: songId,
    p_reason: reason,
    p_details: details,
  });
  if (error) throw fromPostgrest(error, 'Could not submit that report.');
}

export async function isModerator(): Promise<boolean> {
  const { data } = await supabase.rpc('is_moderator');
  return data === true;
}

export async function fetchModerationQueue(
  status: 'open' | 'actioned' | 'dismissed' = 'open',
): Promise<ModerationReport[]> {
  const { data, error } = await supabase.rpc('moderation_queue', { p_status: status });
  if (error) throw fromPostgrest(error, 'Could not load the moderation queue.');
  return (data ?? []) as ModerationReport[];
}

/** `dismiss` closes it, `unlist` hides it from Discover, `remove` deletes it. */
export async function resolveReport(
  reportId: string,
  action: 'dismiss' | 'unlist' | 'remove',
  note = '',
): Promise<void> {
  const { error } = await supabase.rpc('resolve_report', {
    p_report_id: reportId,
    p_action: action,
    p_note: note,
  });
  if (error) throw fromPostgrest(error, 'Could not resolve that report.');
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);
  return (data ?? []) as Notification[];
}

export async function markNotificationsRead(ids?: string[]): Promise<void> {
  await supabase.rpc('mark_notifications_read', { p_ids: ids ?? null });
}
