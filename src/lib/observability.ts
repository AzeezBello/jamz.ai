import { env } from './env';

/**
 * Error reporting and product analytics.
 *
 * Both are optional and both are loaded dynamically, so a build without a DSN
 * or key never downloads the SDKs at all. Everything here is a no-op when
 * unconfigured — nothing should break because monitoring is absent.
 */

type SentryModule = typeof import('@sentry/react');
type PostHogModule = typeof import('posthog-js');

let sentry: SentryModule | null = null;
let posthog: PostHogModule['default'] | null = null;

/** Strips anything that could carry personal data out of an event. */
function scrubUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Recovery and magic-link tokens ride in the fragment and query.
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

export async function initObservability(): Promise<void> {
  if (env.sentryDsn && !sentry) {
    try {
      sentry = await import('@sentry/react');
      sentry.init({
        dsn: env.sentryDsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1,
        // Session replay is deliberately not enabled: it would record the
        // lyrics people are writing.
        beforeSend(event) {
          if (event.request?.url) event.request.url = scrubUrl(event.request.url);
          return event;
        },
      });
    } catch (error) {
      console.warn('Sentry failed to load', error);
    }
  }

  if (env.posthogKey && !posthog) {
    try {
      const module = await import('posthog-js');
      posthog = module.default;
      posthog.init(env.posthogKey, {
        api_host: env.posthogHost,
        // Autocapture would hoover up form contents, including lyrics.
        autocapture: false,
        capture_pageview: false,
        persistence: 'localStorage',
      });
    } catch (error) {
      console.warn('PostHog failed to load', error);
    }
  }
}

/** Associates events with a user without sending their email or name. */
export function identify(userId: string, plan?: string): void {
  sentry?.setUser({ id: userId });
  posthog?.identify(userId, plan ? { plan } : undefined);
}

export function forgetUser(): void {
  sentry?.setUser(null);
  posthog?.reset();
}

export function trackPageView(path: string): void {
  posthog?.capture('$pageview', { $current_url: scrubUrl(window.location.origin + path) });
}

/**
 * Product events. Deliberately a closed set: an open `track(name, props)` ends
 * up carrying prompt text or emails sooner or later.
 */
export type ProductEvent =
  | 'signed_up'
  | 'generation_started'
  | 'generation_completed'
  | 'generation_failed'
  | 'generation_cancelled'
  | 'lyrics_written'
  | 'song_published'
  | 'song_downloaded'
  | 'checkout_started'
  | 'tour_started';

export function track(event: ProductEvent, properties?: Record<string, string | number | boolean>) {
  posthog?.capture(event, properties);
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (sentry) sentry.captureException(error, context ? { extra: context } : undefined);
  else console.error(error, context);
}
