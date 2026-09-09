export type PlanId = 'free' | 'pro' | 'premier';
export type BillingInterval = 'monthly' | 'yearly';
export type SongVisibility = 'private' | 'unlisted' | 'public';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  sort_order: number;
  monthly_price_cents: number;
  yearly_price_cents: number;
  daily_credits: number | null;
  monthly_credits: number | null;
  commercial_use: boolean;
  max_concurrent_jobs: number;
  max_upload_seconds: number;
  stem_count: number;
  features: string[];
}

export interface Profile {
  id: string;
  handle: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  plan_id: PlanId;
  credit_balance: number;
  daily_granted_on: string | null;
  marketing_opt_in: boolean;
  notify_on_complete: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  song_count: number;
  created_at: string;
  updated_at: string;
}

export interface Song {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  style: string;
  lyrics: string | null;
  is_instrumental: boolean;
  duration_seconds: number;
  cover_url: string | null;
  visibility: SongVisibility;
  play_count: number;
  like_count: number;
  commercial_use: boolean;
  model_version: string;
  created_at: string;
  updated_at?: string;
  /** Joined from public_profiles; absent on rows the viewer cannot resolve. */
  artist?: string;
  /** Derived per viewer, never stored on the row. */
  is_liked?: boolean;
}

export interface GenerationJob {
  id: string;
  user_id: string;
  song_id: string | null;
  prompt: string;
  params: {
    lyrics?: string;
    style?: string;
    thumbnailStyle?: string;
    instrumental?: boolean;
    seconds?: number;
    seed?: string;
  };
  status: JobStatus;
  progress: number;
  status_message: string;
  cancel_requested: boolean;
  error_code: string | null;
  error_message: string | null;
  credits_cost: number;
  created_at: string;
}

export interface CreditEntry {
  id: string;
  delta: number;
  balance_after: number;
  reason: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  plan_id: PlanId;
  status: string;
  interval: BillingInterval;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface Invoice {
  id: string;
  stripe_invoice_id: string;
  amount_paid_cents: number;
  currency: string;
  status: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** Errors surfaced from edge functions and RPCs, with a stable code. */
export class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}
