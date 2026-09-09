import { expect, type Page } from '@playwright/test';

/** A fresh address per run so specs never collide on an existing account. */
export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 10_000)}@jamz-e2e.test`;
}

export const TEST_PASSWORD = 'e2e-password-123!';

/**
 * The landing page carries several sign-up affordances — the nav, each pricing
 * card, the social gallery — with near-identical accessible names, so the
 * signed-out locators are scoped to the marketing nav rather than matching on
 * name alone.
 */
function nav(page: Page) {
  return page.getByRole('navigation', { name: 'Main' });
}

/**
 * Signed in, the marketing nav is replaced by a "Studio" sidebar plus a mobile
 * bar, and the account button is rendered in both. `.first()` takes whichever
 * is visible at the current viewport.
 */
function accountButton(page: Page) {
  // Matches the account trigger at any width: the name is hidden on small
  // screens and in the collapsed rail, but the aria-label always carries it.
  return page.getByRole('button', { name: /E2E Tester/ }).first();
}

export async function signUp(page: Page, email = uniqueEmail(), name = 'E2E Tester') {
  await page.goto('/');
  await nav(page).getByRole('button', { name: 'Sign Up', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name', { exact: true }).fill(name);
  await dialog.getByLabel('Email', { exact: true }).fill(email);
  await dialog.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
  await dialog.getByRole('button', { name: 'Create Account' }).click();

  // With confirmations disabled locally the session lands immediately; with
  // them on, the run needs a mail catcher (see e2e/README.md).
  // Every new account is met by the first-run intro, and it is modal — so it
  // has to go before anything else on the page can be found. Its appearance is
  // also the signal that the session and profile have landed.
  await dismissOnboarding(page, { wait: 25_000 });

  await expect(accountButton(page)).toBeVisible({ timeout: 20_000 });
  return { email, name };
}

/**
 * Closes the first-run intro. It is a modal dialog, so until it goes away
 * Radix hides the rest of the page from the accessibility tree and nothing
 * else is findable. Safe to call when the intro is not showing.
 */
export async function dismissOnboarding(page: Page, { wait = 15_000 } = {}) {
  const intro = page.getByRole('dialog').filter({ hasText: 'Describe it, and Jamz makes it' });
  try {
    await intro.waitFor({ state: 'visible', timeout: wait });
  } catch {
    return; // Already onboarded, or not signed in.
  }
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(intro).toBeHidden();
}

export async function signIn(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto('/');
  await nav(page).getByRole('button', { name: 'Sign In', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email', { exact: true }).fill(email);
  await dialog.getByLabel('Password', { exact: true }).fill(password);
  await dialog.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(dialog).toBeHidden();
}

export async function signOut(page: Page) {
  await accountButton(page).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(nav(page).getByRole('button', { name: 'Sign Up', exact: true })).toBeVisible();
}

/** Reads the credit balance shown in the header chip on /dashboard. */
export async function readCredits(page: Page): Promise<number> {
  await page.goto('/dashboard');
  await dismissOnboarding(page, { wait: 3_000 });

  // The studio panel also shows a balance, so read the header chip, which is
  // the only one that is a link to billing.
  const text = await page
    .getByRole('link', { name: /\d+ credits/ })
    .first()
    .innerText();

  const digits = text.replace(/\D/g, '');
  if (!digits) throw new Error(`Could not read a credit balance from "${text}"`);
  return Number(digits);
}

export async function generateSong(page: Page, prompt: string) {
  await page.goto('/');
  await page.getByLabel('Describe the song you want').fill(prompt);
  // `exact` matters: the quick-prompt chips are buttons whose labels start
  // with "Create an upbeat pop song…", so a substring match is ambiguous.
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Creating your song');
}
