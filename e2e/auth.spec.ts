import { expect, test } from '@playwright/test';
import { signUp, signOut, uniqueEmail } from './fixtures';

test.describe('authentication', () => {
  test('a new account can sign up and reach the dashboard', async ({ page }) => {
    await signUp(page);
    await page.goto('/dashboard');
    // The topbar names the current view; the dashboard opens on the library.
    await expect(page.getByRole('heading', { name: 'My Library' })).toBeVisible();
  });

  test('each entry point opens the form it advertises', async ({ page }) => {
    // Regression: AuthModal seeded its tab with useState(defaultTab), which
    // ignores later prop changes, so opening Sign In first left Sign Up
    // showing the sign-in form — on the primary conversion path.
    const mainNav = page.getByRole('navigation', { name: 'Main' });
    const dialog = page.getByRole('dialog');

    await page.goto('/');
    await mainNav.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(dialog.getByRole('tab', { name: 'Sign In' })).toHaveAttribute(
      'data-state',
      'active',
    );

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await mainNav.getByRole('button', { name: 'Sign Up', exact: true }).click();
    await expect(dialog.getByRole('tab', { name: 'Sign Up' })).toHaveAttribute(
      'data-state',
      'active',
    );
    await expect(dialog.getByLabel('Name', { exact: true })).toBeVisible();
  });

  test('a wrong password is rejected', async ({ page }) => {
    // The old build accepted any credentials at all.
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Sign In', exact: true })
      .click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Email', { exact: true }).fill(uniqueEmail());
    await dialog.getByLabel('Password', { exact: true }).fill('definitely-not-the-password');
    await dialog.getByRole('button', { name: 'Sign In', exact: true }).click();

    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test('signing out clears the previous account library', async ({ page }) => {
    await signUp(page);
    await page.goto('/dashboard');
    await signOut(page);

    // The guard sends a signed-out visitor home, and nothing is left behind.
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/');

    const leaked = await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => /song|library|user/i.test(key)),
    );
    expect(leaked).toEqual([]);
  });

  test('protected routes redirect when signed out', async ({ page }) => {
    for (const route of ['/dashboard', '/settings', '/billing']) {
      await page.goto(route);
      await expect(page).toHaveURL('/');
    }
  });
});
