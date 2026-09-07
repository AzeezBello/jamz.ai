import { expect, type Page } from '@playwright/test';

/** A fresh address per run so specs never collide on an existing account. */
export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 10_000)}@jamz-e2e.test`;
}

export const TEST_PASSWORD = 'e2e-password-123!';

/**
 * The landing page carries several sign-up affordances — the nav, each pricing
 * card, the social gallery — with near-identical accessible names, so these
 * locators are scoped to the nav rather than matching on name alone.
 */
function nav(page: Page) {
  return page.getByRole('navigation', { name: 'Main' });
}

export async function signUp(page: Page, email = uniqueEmail(), name = 'E2E Tester') {
  await page.goto('/');
  await nav(page).getByRole('button', { name: 'Sign Up', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel('Password').fill(TEST_PASSWORD);
  await dialog.getByRole('button', { name: 'Create Account' }).click();

  // With confirmations disabled locally the session lands immediately; with
  // them on, the run needs a mail catcher (see e2e/README.md).
  await expect(nav(page).getByRole('button', { name: /E2E Tester/ })).toBeVisible({
    timeout: 20_000,
  });
  return { email, name };
}

export async function signIn(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto('/');
  await nav(page).getByRole('button', { name: 'Sign In', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel('Password').fill(password);
  await dialog.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(dialog).toBeHidden();
}

export async function signOut(page: Page) {
  await nav(page)
    .getByRole('button', { name: /E2E Tester|@/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(nav(page).getByRole('button', { name: 'Sign Up', exact: true })).toBeVisible();
}

/** Reads the credit balance shown in the header chip on /dashboard. */
export async function readCredits(page: Page): Promise<number> {
  await page.goto('/dashboard');
  const text = await page
    .getByText(/\d+ credits/)
    .first()
    .innerText();
  return Number(text.replace(/\D/g, ''));
}

export async function generateSong(page: Page, prompt: string) {
  await page.goto('/');
  await page.getByLabel('Describe the song you want').fill(prompt);
  // `exact` matters: the quick-prompt chips are buttons whose labels start
  // with "Create an upbeat pop song…", so a substring match is ambiguous.
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Creating your song');
}
