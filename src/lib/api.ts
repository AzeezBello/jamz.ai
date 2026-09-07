import { supabase } from './supabase';
import { env } from './env';
import {
  ApiError,
  type BillingInterval,
  type CreditEntry,
  type GenerationJob,
  type Invoice,
  type Notification,
  type Plan,
  type PlanId,
  type Profile,
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

export async function fetchProfile(userId: string): Promise<Profile> {
  // Rolls the daily allowance forward before reading, so the balance the user
  // sees is the balance a generation would actually use.
  await supabase.rpc('grant_daily_credits', { p_user_id: userId });

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error) throw fromPostgrest(error, 'Could not load your profile.');
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  patch: Partial<
    Pick<
      Profile,
      'display_name' | 'handle' | 'bio' | 'avatar_url' | 'marketing_opt_in' | 'notify_on_complete'
    >
  >,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw fromPostgrest(error, 'Could not save your profile.');
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
  'id, user_id, title, prompt, style, is_instrumental, duration_seconds, cover_url, visibility, play_count, like_count, commercial_use, model_version, created_at';

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

export async function fetchMySongs(
  options: { search?: string; limit?: number } = {},
): Promise<Song[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('songs')
    .select(SONG_COLUMNS)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 100);

  if (options.search?.trim()) {
    const term = options.search.trim().replace(/[%,()]/g, '');
    query = query.or(`title.ilike.%${term}%,prompt.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw fromPostgrest(error, 'Could not load your library.');
  return decorate((data ?? []) as Song[]);
}

export async function fetchPublicSongs(
  options: { search?: string; limit?: number } = {},
): Promise<Song[]> {
  let query = supabase
    .from('songs')
    .select(SONG_COLUMNS)
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .order('play_count', { ascending: false })
    .limit(options.limit ?? 24);

  if (options.search?.trim()) {
    const term = options.search.trim().replace(/[%,()]/g, '');
    query = query.or(`title.ilike.%${term}%,prompt.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw fromPostgrest(error, 'Could not load the feed.');
  return decorate((data ?? []) as Song[]);
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
// Generation
// ---------------------------------------------------------------------------

export interface GenerationOptions {
  prompt: string;
  style?: string;
  instrumental?: boolean;
  seconds?: number;
  idempotencyKey?: string;
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
