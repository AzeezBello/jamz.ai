import { expect, test } from '@playwright/test';
import { generateSong, signUp } from './fixtures';

test.describe('moderation', () => {
  test('a normal account cannot reach the queue', async ({ page }) => {
    // The page is not hidden — it explains the restriction. The database
    // refuses regardless of what renders.
    await signUp(page);
    await page.goto('/moderation');
    await expect(page.getByText('Moderation is restricted')).toBeVisible();
  });

  test('a public song can be reported by someone else', async ({ page, context }) => {
    await signUp(page);
    await generateSong(page, 'a public track that will get reported');
    await expect(page.getByRole('dialog')).toContainText('is ready', { timeout: 90_000 });
    await page.getByRole('button', { name: 'Open song page' }).click();
    const songUrl = page.url();

    await page.goto('/dashboard');
    await page
      .getByRole('button', { name: /More actions/ })
      .first()
      .click();
    await page.getByRole('menuitemradio', { name: 'Public' }).click();

    // A second account does the reporting; you cannot report your own song.
    const other = await context.browser()!.newPage();
    await signUp(other);
    await other.goto(songUrl);

    await other.getByRole('button', { name: 'Report' }).click();
    const dialog = other.getByRole('dialog');
    await expect(dialog).toContainText('Report');
    await dialog.getByRole('button', { name: 'Report' }).click();
    await expect(other.getByText(/Report submitted/)).toBeVisible({ timeout: 15_000 });
    await other.close();
  });

  test('you cannot report your own song', async ({ page }) => {
    await signUp(page);
    await generateSong(page, 'a song of my very own');
    await expect(page.getByRole('dialog')).toContainText('is ready', { timeout: 90_000 });
    await page.getByRole('button', { name: 'Open song page' }).click();

    await expect(page.getByRole('button', { name: 'Report' })).toHaveCount(0);
  });
});
