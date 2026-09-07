import { expect, test } from '@playwright/test';
import { generateSong, signUp } from './fixtures';

test.describe('routing and sharing', () => {
  test('an unknown route renders the 404 page', async ({ page }) => {
    await page.goto('/definitely-not-a-page');
    await expect(page.getByText('404')).toBeVisible();
  });

  test('a private song is not readable by a signed-out visitor', async ({ page, context }) => {
    await signUp(page);
    await generateSong(page, 'a private track nobody else should hear');
    await expect(page.getByRole('dialog')).toContainText('is ready', { timeout: 90_000 });

    await page.getByRole('button', { name: 'Open song page' }).click();
    const url = page.url();

    // A fresh context has no session, and RLS hides the row entirely.
    const anonymous = await context.browser()!.newPage();
    await anonymous.goto(url);
    await expect(anonymous.getByText('404')).toBeVisible();
    await anonymous.close();
  });

  test('a public song is readable by a signed-out visitor', async ({ page, context }) => {
    await signUp(page);
    await generateSong(page, 'a public anthem for everyone');
    await expect(page.getByRole('dialog')).toContainText('is ready', { timeout: 90_000 });
    await page.getByRole('button', { name: 'Open song page' }).click();
    const url = page.url();

    await page.goto('/dashboard');
    await page
      .getByRole('button', { name: /More actions/ })
      .first()
      .click();
    await page.getByRole('menuitemradio', { name: 'Public' }).click();

    const anonymous = await context.browser()!.newPage();
    await anonymous.goto(url);
    await expect(anonymous.getByRole('heading', { name: /Public Anthem/i })).toBeVisible();
    await anonymous.close();
  });
});
