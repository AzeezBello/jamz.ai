import { expect, test } from '@playwright/test';
import { signUp, signOut, uniqueEmail } from './fixtures';

test.describe('authentication', () => {
  test('a new account can sign up and reach the dashboard', async ({ page }) => {
    await signUp(page);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'My Dashboard' })).toBeVisible();
  });

  test('a wrong password is rejected', async ({ page }) => {
    // The old build accepted any credentials at all.
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign In' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Email').fill(uniqueEmail());
    await dialog.getByLabel('Password').fill('definitely-not-the-password');
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
