/**
 * Destinations for the marketing chrome.
 *
 * Every entry resolves to a real URL or to `null`. Links that resolve to
 * `null` are not rendered at all — an `href="#"` that silently does nothing is
 * worse than an absent link, because it looks like a working product feature.
 * Point the VITE_* variables at real pages as they go live.
 */
const external = (value: string | undefined) => (value && value.trim() ? value.trim() : null);

const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL ?? '';
const mailto = supportEmail ? `mailto:${supportEmail}` : null;

export interface SiteLink {
  label: string;
  href: string;
  /** Internal links go through the router; external ones open in a new tab. */
  internal?: boolean;
}

function group(entries: Array<[string, string | null, boolean?]>): SiteLink[] {
  return entries
    .filter((entry): entry is [string, string, boolean?] => Boolean(entry[1]))
    .map(([label, href, internal]) => ({ label, href, internal }));
}

export const footerGroups: Record<string, SiteLink[]> = {
  Brand: group([
    ['About', external(import.meta.env.VITE_ABOUT_URL)],
    ['Work at Jamz', external(import.meta.env.VITE_CAREERS_URL)],
    ['Blog', external(import.meta.env.VITE_BLOG_URL)],
    ['Pricing', '/pricing', true],
  ]),
  Hub: group([
    ['Support', mailto],
    ['Help', external(import.meta.env.VITE_HELP_URL)],
    ['Contact Us', mailto],
    ['Community Guidelines', external(import.meta.env.VITE_GUIDELINES_URL)],
  ]),
  Legal: group([
    ['Terms of Service', external(import.meta.env.VITE_TERMS_URL)],
    ['Privacy Policy', external(import.meta.env.VITE_PRIVACY_URL)],
    ['AI Disclosure', external(import.meta.env.VITE_AI_DISCLOSURE_URL)],
  ]),
};

export const legalLinks: SiteLink[] = group([
  ['Terms', external(import.meta.env.VITE_TERMS_URL)],
  ['Privacy', external(import.meta.env.VITE_PRIVACY_URL)],
  ['Cookies', external(import.meta.env.VITE_COOKIES_URL)],
]);

export const appStoreLinks = {
  ios: external(import.meta.env.VITE_IOS_APP_URL),
  android: external(import.meta.env.VITE_ANDROID_APP_URL),
};
